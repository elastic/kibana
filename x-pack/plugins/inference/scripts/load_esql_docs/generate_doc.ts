/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import pLimit from 'p-limit';
import { ScriptInferenceClient } from '../util/kibana_client';
import { ToolingLog } from '@kbn/tooling-log';
import type { ExtractionOutput, ExtractedCommandOrFunc } from './extract_doc_entries';

interface FileToWrite {
  name: string;
  content: string;
}

export const generateDoc = async ({
  extraction,
  inferenceClient,
  log,
}: {
  extraction: ExtractionOutput;
  log: ToolingLog;
  inferenceClient: ScriptInferenceClient;
}) => {
  const filesToWrite: FileToWrite[] = [];

  const limiter = pLimit(10);

  const documentation = JSON.stringify(extraction.pages, undefined, 2);

  const generatedFunctions = await Promise.all(
    extraction.functions.slice(0, 5).map(async (func) => {
      return limiter(async () => {
        const improvedMarkdown = await improveFunction({
          content: func.markdownContent,
          client: inferenceClient,
          documentation,
        });
        return {
          ...func,
          markdownContent: improvedMarkdown,
        };
      });
    })
  );
  generatedFunctions.forEach((func) => {
    filesToWrite.push({
      name: fileNameForFunc(func.name),
      content: func.markdownContent,
    });
  });

  // TODO rest of it

  return filesToWrite;
};

export const improveFunction = async ({
  content,
  documentation,
  client,
}: {
  content: string;
  documentation: string;
  client: ScriptInferenceClient;
}) => {
  const response = await lastValueFrom(
    client.output('convert_to_markdown', {
      connectorId: client.getConnectorId(),
      system: `
      You are a helpful assistant specialized in checking and improving technical documentation
      about ES|QL, the new Query language from Elasticsearch written in Markdown format.

      You will be provided a technical documentation article from the user. Please do the following:

      - If you think content of the  "Description" section can be improved or rewritten in a way that
        makes it more clear and explicit, please do so.
      - Add a very short (one sentence, only a few word) presentation of the function or command at the very
        top of the document, just below the main title. E.g. "The FOO function is used to [...]". Do NOT mention
        ES|QL in that description.
      - If any limitations impacting this function or command are mentioned in other documents, such
        as the "esql-limitations.html" file, please add a "Limitations" section at the bottom of the file
        and mention them. Otherwise, don't say or mention that there are no limitations.
      - If you think the provided list of examples don't cover all the functionality of the command or
        function described, please add some. However, DO NOT remove or edit in any way the existing examples.
      - DO NOT modify the main title of the page, it must only be the command name, e.g. "## AVG"
      - DO NOT anything that was not explicitly requested in your instructions

      Please answer exclusively with the content of the document, without any additional messages,
      information, though or reasoning. Do not quote the output with \`\`\`.

      The full documentation, in JSON format:
      \`\`\`json
      ${documentation}
      \`\`\`
      `,
      input: `
      This is the technical document page you need to improve:

      \`\`\`markdown
      ${content}
      \`\`\`
      `,
    })
  );

  const output = response.content!;
  return output;
};

const fileNameForFunc = (funcName: string) =>
  `esql-${funcName.replaceAll(' ', '-').toLowerCase()}.txt`;
