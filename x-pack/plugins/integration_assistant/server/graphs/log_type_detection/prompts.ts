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
    `You are a helpful, expert assistant in identifying different log types based on the format.

Here is some context for you to reference for your task, read it carefully as you will get questions about it later:
<context>
<log_samples>
{log_samples}
</log_samples>
</context>`,
  ],
  [
    'human',
    `Looking at the log samples , our goal is to identify the syslog type based on the guidelines below.
Follow these steps to identify the log format type:
1. Go through each log sample and identify the log format type.
2. If the samples have any or all of priority, timestamp, loglevel, hostname, ipAddress, messageId in the beginning information then set "header: true".
3. If the samples have a syslog header then set "header: true" , else set "header: false". If you are unable to determine the syslog header presence then set "header: false".
4. If the log samples have structured message body with key-value pairs then classify it as "log_type: structured". Look for a flat list of key-value pairs, often separated by spaces, commas, or other delimiters.
5. Consider variations in formatting, such as quotes around values ("key=value", key="value"), special characters in keys or values, or escape sequences.
6. If the log samples have unstructured body like a free-form text then classify it as "log_type: unstructured".
7. If the log samples follow a csv format then classify it as "log_type: csv".
8. If the samples are identified as "csv" and there is a csv header then set "header: true" , else set "header: false".
9. If you do not find the log format in any of the above categories then classify it as "log_type: unsupported".

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
</example>`,
  ],
  ['ai', 'Please find the JSON object below:'],
]);
