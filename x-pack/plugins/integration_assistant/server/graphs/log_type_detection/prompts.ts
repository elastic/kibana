/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ChatPromptTemplate } from '@langchain/core/prompts';
export const LOG_FORMAT_DETECTION_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant specializing in all things logs. You're great at analyzing log samples.`,
  ],
  [
    'human',
    `The current task is to identify the log format from the provided samples based on the guidelines below.

The samples apply to the data stream {datastream_title} inside the integration package {package_title}.

Follow these steps to do this:
1. Go through each log sample and identify the log format. Output this as "name: <log_format>".
2. If the samples have any or all of priority, timestamp, loglevel, hostname, ipAddress, messageId in the beginning information then set "header: true".
3. If the samples have a syslog header then set "header: true" , else set "header: false". If you are unable to determine the syslog header presence then set "header: false".
4. If the log samples have structured message body with key-value pairs then classify it as "name: structured". Look for a flat list of key-value pairs, often separated by spaces, commas, or other delimiters.
5. Consider variations in formatting, such as quotes around values ("key=value", key="value"), special characters in keys or values, or escape sequences.
6. If the log samples have unstructured body like a free-form text then classify it as "name: unstructured".
7. If the log samples follow a csv format then classify it with "name: csv". There are two sub-cases for csv:
  a. If there is a csv header then set "header: true".
  b. If there is no csv header then set "header: false" and try to find good names for the columns in the "columns" array by looking into the values of data in those columns. For each column, if you are unable to find good name candidate for it then output an empty string, like in the example.
8. If you cannot put the format into any of the above categories then classify it with "name: unsupported".

You ALWAYS follow these guidelines when writing your response:
<guidelines>
- Do not respond with anything except the updated current mapping JSON object enclosed with 3 backticks (\`). See example response below.
</guidelines>

Example response format:
<example>
A: Please find the JSON object below:
\`\`\`json
{ex_answer}
\`\`\`
</example>

Please process these log samples:
<log_samples>
{log_samples}
</log_samples>
`,
  ],
  ['ai', 'Please find the JSON object below:'],
]);
