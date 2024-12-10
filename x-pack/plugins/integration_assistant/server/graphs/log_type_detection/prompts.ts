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
1. Go through each log sample and identify the log format. Output this as "name: <log_format>". Here are the values for log_format:
  * 'csv': If the log samples follow a Comma-Separated Values format then classify it with "name: csv". There are two sub-cases for csv:
     a. If there is a csv header then set "header: true".
     b. If there is no csv header then set "header: false" and try to find good names for the columns in the "columns" array by looking into the values of data in those columns. For each column, if you are unable to find good name candidate for it then output an empty string, like in the example.
  * 'structured': If the log samples have structured message body with key-value pairs then classify it as "name: structured". Look for a flat list of key-value pairs, often separated by some delimiters. Consider variations in formatting, such as quotes around values ("key=value", key="value"), special characters in keys or values, or escape sequences.
  * 'unstructured': If the log samples have unstructured body like a free-form text then classify it as "name: unstructured".
  * 'cef': If the log samples have Common Event Format (CEF) then classify it as "name: cef".
  * 'leef': If the log samples have Log Event Extended Format (LEEF) then classify it as "name: leef".
  * 'fix': If the log samples have Financial Information eXchange (FIX) then classify it as "name: fix".
  * 'unsupported': If you cannot put the format into any of the above categories then classify it with "name: unsupported".
2. Header: for structured and unstructured format:
  - if the samples have any or all of priority, timestamp, loglevel, hostname, ipAddress, messageId in the beginning information then set "header: true".
  - if the samples have a syslog header then set "header: true"
  - else set "header: false". If you are unable to determine the syslog header presence then set "header: false".
3. Note that a comma-separated list should be classified as 'csv' if its rows only contain values separated by commas. But if it looks like a list of comma separated key-values pairs like 'key1=value1, key2=value2' it should be classified as 'structured'.

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
