/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs/promises';
import Path from 'path';
import $, { load, Cheerio, AnyNode } from 'cheerio';
import { partition } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import { extractSections } from './extract_sections';

interface ExtractedDocEntry {
  /** the title of the page **/
  title: string;
  /** the content that should be used **/
  content: string;
  /** LLM instructions to perform doc generation **/
  instructions?: string;
  /** if true, no page will be generated for this entry.
   * Note that the file will still be used as context to generate the other entries
   **/
  skip?: boolean;
}

export async function extractDocEntries({
  file,
  log,
}: {
  file: string;
  log: ToolingLog;
}): Promise<ExtractedDocEntry[]> {
  const fileContents = await Fs.readFile(file);
  const $element = load(fileContents.toString())('*');

  // TODO: remove
  if (Path.basename(file) !== 'esql-commands.html') {
    return [];
  }

  switch (Path.basename(file)) {
    case 'esql-commands.html':
      return extractSections($element)
        .slice(0, 5) // TODO: remove
        .filter(({ title }) => !!title.match(/^[A-Z_]+$/))
        .map((doc) => ({
          ...doc,
          instructions: `For this command, generate a Markdown document containing the following sections:

                    ## {Title}

                    {What this command does, the use cases, and any limitations from this document or esql-limitations.txt}

                    ### Syntax

                    {the content of the "Syntax" section of the document}

                    ### Parameters

                    {the content of the "Parameters" section of the document}

                    ### Examples

                    {example ES|QL queries using this command. prefer to copy mentioned queries, but make sure there are at least three different examples, focusing on different usages of this command}`,
        }));

    case 'esql-syntax.html':
      return [
        {
          title: 'Syntax',
          content: getSimpleText($element),
          instructions: `Generate a description of Elastic ES|QL syntax. Make sure to reuse as much as possible the provided content of file and be as complete as possible.
                    For timespan literals, generate at least five examples of full ES|QL queries, using a mix commands and functions, using different intervals and units.
                    **Make sure you use timespan literals, such as \`1 day\` or \`24h\` or \`7 weeks\` in these examples**.
                    Combine ISO timestamps with time span literals and NOW().
                    Make sure the example queries are using different combinations of syntax, commands and functions for each, and use BUCKET at least twice
                    When using DATE_TRUNC, make sure you DO NOT wrap the timespan in single or double quotes.
                    Do not use the Cast operator. In your examples, make sure to only use commands and functions that exist in the provided documentation.
                    `,
        },
      ];

    case 'esql.html':
      return [
        {
          title: 'Overview',
          content: getSimpleText($element).replace(
            /The ES\|QL documentation is organized in these sections(.*)$/,
            ''
          ),
          instructions: `Generate a description of ES|QL as a language. Ignore links to other documents. From Limitations, include the known limitations, but ignore limitations that are specific to a command.
                      Include a summary of what is mentioned in the CROSS_CLUSTER, Kibana and API sections. Explain how to use the REST API with an example and mention important information for Kibana usage and cross cluster querying.`,
        },
      ];

    case 'esql-functions-operators.html':
      const sections = extractSections($element);

      const searches = [
        'Binary operators',
        'Equality',
        'Inequality',
        'Less than',
        'Greater than',
        'Add +',
        'Subtract -',
        'Multiply *',
        'Divide /',
        'Modulus %',
        'Unary operators',
        'Logical operators',
        'IS NULL',
        'IS NOT NULL',
        'Cast (::)',
      ];

      const matches = ['IN', 'LIKE', 'RLIKE'];

      const [operatorSections, allOtherSections] = partition(sections, (section) => {
        return (
          matches.includes(section.title) ||
          searches.some((search) => section.title.toLowerCase().startsWith(search.toLowerCase()))
        );
      });

      return allOtherSections
        .map((section) => ({
          ...section,
          instructions: `For each function, use the following template:

                  ## {Title}

                  {description of what this function does}

                  ### Examples

                  {at least two examples of full ES|QL queries. prefer the ones in the document verbatim}
                  `,
        }))
        .concat({
          title: 'Operators',
          content: operatorSections.map(({ title, content }) => `${title}\n${content}`).join('\n'),
          instructions:
            'Generate a document describing the operators. For each type of operator (binary, unary, logical, and the remaining), generate a section. For each operator, generate at least one full ES|QL query as an example of its usage. Keep it short, e.g. only a ```esql\nFROM ...\n| WHERE ... ```',
        });

    case 'esql-cross-clusters.html':
      return [
        {
          title: 'CROSS_CLUSTER',
          content: getSimpleText($element),
          skip: true,
        },
      ];

    case 'esql-limitations.html':
      return [
        {
          title: 'Limitations',
          content: getSimpleText($element),
          skip: true,
        },
      ];

    case 'esql-query-api.html':
      return [
        {
          title: 'API',
          content: getSimpleText($element),
          skip: true,
        },
      ];

    case 'esql-kibana.html':
      return [
        {
          title: 'Kibana',
          content: getSimpleText($element),
          skip: true,
        },
      ];

    default:
      log.debug('Dropping file', file);
      return [];
  }
}

function getSimpleText($element: Cheerio<AnyNode>) {
  $element.remove('.navfooter');
  $element.remove('#sticky_content');
  $element.find('code').each(function () {
    $(this).replaceWith('`' + $(this).text() + '`');
  });
  return $element
    .find('.section,section,.part')
    .last()
    .text()
    .replaceAll(/([\n]\s*){2,}/g, '\n');
}
