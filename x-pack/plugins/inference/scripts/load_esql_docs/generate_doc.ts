/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import pLimit from 'p-limit';
import { ToolingLog } from '@kbn/tooling-log';
import { ScriptInferenceClient } from '../util/kibana_client';
import type { ExtractionOutput, ExtractedCommandOrFunc } from './extract_doc_entries';
import { improveFunctionPrompt, createPageInstructionPrompt } from './prompts/convert';
import { bindOutput } from './output_executor';

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

  const callOutput = bindOutput({
    connectorId: inferenceClient.getConnectorId(),
    output: inferenceClient.output,
  });

  const documentation = JSON.stringify(
    {
      pages: extraction.pages.filter((page) => {
        return !['query-api', 'cross-clusters'].includes(page.name);
      }),
      commands: extraction.commands,
      functions: extraction.functions.filter((func) => {
        return ['BUCKET', 'COUNT', 'CASE', 'DATE_EXTRACT', 'DATE_DIFF', 'DATE_TRUNC'].includes(
          func.name
        );
      }),
    },
    undefined,
    2
  );

  const generatedFunctions = await Promise.all(
    // TODO: remove slice
    extraction.functions.slice(0, 5).map(async (func) => {
      return limiter(async () => {
        const improvedMarkdown = await callOutput(
          improveFunctionPrompt({ content: func.markdownContent, documentation })
        );
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

  // TODO: generated commands

  const pageContentByName = (pageName: string) =>
    extraction.pages.find((page) => page.name === pageName)!.content;

  const examplesPrompt = createPageInstructionPrompt({
    documentation: JSON.stringify(
      {
        pages: extraction.pages.filter((page) => {
          return ['operators', 'multi-index'].includes(page.name);
        }),
        commands: extraction.commands,
        functions: extraction.functions.filter((func) => {
          return [
            'AVG',
            'COUNT',
            'COUNT_DISTINCT',
            'MIN',
            'PERCENTILE',
            'BUCKET',
            'CASE',
            'DATE_EXTRACT',
            'DATE_FORMAT',
            'DATE_PARSE',
            'DATE_TRUNC',
            'FLOOR',
            'ROUND',
            'ENDS_WITH',
            'LENGTH',
            'REPLACE',
            'SUBSTRING',
            'TO_LOWER',
          ].includes(func.name);
        }),
      },
      undefined,
      2
    ),
    content: pageContentByName('examples'),
    specificInstructions: `
      Please generate a page listing relevant examples of ES|QL queries.
      Start by reusing the examples provided in the source document, then add at least 5 new ones.
      Use different commands as much as possible between examples.
      Provide at least two different examples using the BUCKET function.
      Make sure that the ES|QL syntax is valid, using the provided documentation.
    `,
  });

  filesToWrite.push({
    name: 'esql-examples.txt',
    content: await callOutput(examplesPrompt),
  });

  filesToWrite.push({
    name: 'esql-syntax.txt',
    content: await callOutput(
      createPageInstructionPrompt({
        documentation,
        content: pageContentByName('syntax'),
        specificInstructions: `
       Generate a description of Elastic ES|QL syntax. Make sure to reuse as much as possible the provided content of file and be as complete as possible.
       For timespan literals, generate at least five examples of full ES|QL queries, using a mix commands and functions, using different intervals and units.
       **Make sure you use timespan literals, such as \`1 day\` or \`24h\` or \`7 weeks\` in these examples**.
       Combine ISO timestamps with time span literals and NOW().
       Make sure the example queries are using different combinations of syntax, commands and functions for each, and use BUCKET at least twice
       When using DATE_TRUNC, make sure you DO NOT wrap the timespan in single or double quotes.
       Do not use the Cast operator. In your examples, make sure to only use commands and functions that exist in the provided documentation.
   `,
      })
    ),
  });

  filesToWrite.push({
    name: 'esql-overview.txt',
    content: await callOutput(
      createPageInstructionPrompt({
        documentation,
        content: pageContentByName('overview'),
        specificInstructions: `Generate a description of ES|QL as a language. Ignore links to other documents.
        From Limitations, include the known limitations, but ignore limitations that are specific to a command.
        Include a summary of what is mentioned in the CROSS_CLUSTER, Kibana and API sections.
        Explain how to use the REST API with an example and mention important information for Kibana usage and cross cluster querying.`,
      })
    ),
  });

  filesToWrite.push({
    name: 'esql-operators.txt',
    content: await callOutput(
      createPageInstructionPrompt({
        documentation,
        content: pageContentByName('operators'),
        specificInstructions: `
          Generate a document describing the operators.
          For each type of operator (binary, unary, logical, and the remaining), generate a section.
          For each operator, generate at least one full ES|QL query as an example of its usage.
          Keep it short, e.g. only a \`\`\`esql\\nFROM ...\\n| WHERE ... \`\`\`
          `,
      })
    ),
  });

  return filesToWrite;
};

const fileNameForFunc = (funcName: string) =>
  `esql-${funcName.replaceAll(' ', '-').toLowerCase()}.txt`;
