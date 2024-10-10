/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ChatPromptTemplate } from '@langchain/core/prompts';

export const KV_MAIN_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an expert in creating Elasticsearch KV processors. Here is some context for you to reference for your task, read it carefully as you will get questions about it later:

 <context>
 <samples>
 {samples}
 </samples>
 </context>`,
  ],
  [
    'human',
    `Looking at the multiple log samples provided in the context, our goal is to create a KV processor that can parse the logs. Analyze the logs  to understand their structure, including any key-value pairs, delimiters, and patterns.

 Follow these steps to help improve the KV processor and apply it to each field step by step:

 1. Based on your analysis of the log samples, identify different key-value pairs and the delimeters that separates them, create a KV processor that can parse log. The processor should correctly handle logs where keys and values are separated by a \`field_split\` and pairs are separated by \`value_split\`.
 2. Recognize and properly format different data types such as strings, numbers, and timestamps.
 3. Handle quoted values correctly (e.g., error="Insufficient funds").
 4. The \`value_split\` is the delimeter regex pattern to use for splitting the key from the value within a key-value pair (e.g., ':' or '=' )
 5. The \`field_split\` is the regex pattern to use for splitting key-value pairs in the log. Make sure the regex pattern breaks the log into key-value pairs.
 6. Ensure that the KV processor can handle different scenarios, such as: Optional or missing fields in the logs , Varying delimiters between keys and values (e.g., = or :), Complex log structures (e.g., nested key-value pairs or key-value pairs within strings, whitespaces , urls, ipv4 , ipv6 address, mac address etc.,).
 7. Use \`trim_key\` for string of characters to trim from extracted keys.
 8. Use \`trim_value\` for string of characters to trim from extracted values.

 You ALWAYS follow these guidelines when writing your response:
 <guidelines>
 - Use only elasticsearch kv processor.
 - Do not create any other processors.
 - Do not add any prefix to the processor.
 - Do not use the special characters like \`\s\` or \`\\s+\` in the \`field_split\` or \`value_split\` regular expressions.
 - Always use single backslash (\\) for escaping special characters in \`field_split\` or \`value_split\` regular expressions.
 - Do not add brackets (), <>, [] as well as single or double quotes in \`trim_value\`.
 - Make sure to trim whitespaces in \`trim_key\`. 
 - Do not respond with anything except the processor as a JSON object enclosed with 3 backticks (\`), see example response below. Use strict JSON response format.
 </guidelines>

 Example response format:

 <example_response>
 A: Please find the JSON object below:
 \`\`\`json
{ex_answer}
 \`\`\`
 </example_response>`,
  ],
  ['ai', 'Please find the JSON object below:'],
]);

export const KV_HEADER_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an expert in Syslogs and identifying the headers and structured body in syslog messages. Here is some context for you to reference for your task, read it carefully as you will get questions about it later:
 <context>
 <samples>
 {samples}
 </samples>
 </context>`,
  ],
  [
    'human',
    `Looking at the multiple syslog samples provided in the context, your task is to separate the "header" and the "message body" from this log. Our goal is to identify which RFC they belong to. Then create a regex pattern that can separate the header and the structured body.
You then have to create a grok pattern using the regex pattern.
You are given a log entry in a structured format. 

Follow these steps to identify the header pattern:
1. Identify if the log samples fall under RFC5424 or RFC3164. If not, return 'Custom Format'.
2. The log samples contain the header and structured body. The header may contain any or all of priority, timestamp, loglevel, hostname, ipAddress, messageId or any free-form text or non key-value information etc.,
3. Make sure the regex and grok pattern matches all the header information. Only the structured message body should be under GREEDYDATA in grok pattern.

 You ALWAYS follow these guidelines when writing your response:
 <guidelines>
 - Do not parse the message part in the regex. Just the header part should be in regex and grok_pattern.
 - Make sure to map the remaining message body to \'message\' in grok pattern.
 - Make sure to add \`{packageName}.{dataStreamName}\` as a prefix to each field in the pattern. Refer to example response.
 - Do not respond with anything except the processor as a JSON object enclosed with 3 backticks (\`), see example response above. Use strict JSON response format.
 </guidelines>

 You are required to provide the output in the following example response format:

 <example_response>
 A: Please find the JSON object below:
 \`\`\`json
 {ex_answer}
 \`\`\`
 </example_response>`,
  ],
  ['ai', 'Please find the JSON object below:'],
]);

export const KV_HEADER_ERROR_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an expert in Syslogs and identifying the headers and structured body in syslog messages. Here is some context for you to reference for your task, read it carefully as you will get questions about it later:
<context>
<current_pattern>
{current_pattern}
</current_pattern>
</context>`,
  ],
  [
    'human',
    `Please go through each error below, carefully review the provided current grok pattern, and resolve the most likely cause to the supplied error by returning an updated version of the current_pattern.

<errors>
{errors}
</errors>

Follow these steps to fix the errors in the header pattern:
1. Identify any mismatches, incorrect syntax, or logical errors in the pattern.
2. The log samples contain the header and structured body. The header may contain any or all of priority, timestamp, loglevel, hostname, ipAddress, messageId or any free-form text or non key-value information etc.,
3. The message body may start with a description, followed by structured key-value pairs.
4. Make sure the regex and grok pattern matches all the header information. Only the structured message body should be under GREEDYDATA in grok pattern.
You ALWAYS follow these guidelines when writing your response:
 <guidelines>
 - Do not parse the message part in the regex. Just the header part should be in regex and grok_pattern.
 - Make sure to map the remaining message body to \'message\' in grok pattern.
 - Make sure to add \`{packageName}.{dataStreamName}\` as a prefix to each field in the pattern. Refer to example response.
 - Do not respond with anything except the processor as a JSON object enclosed with 3 backticks (\`), see example response above. Use strict JSON response format.
 </guidelines>

 You are required to provide the output in the following example response format:

 <example_response>
 A: Please find the JSON object below:
 \`\`\`json
 {ex_answer}
 \`\`\`
 </example_response>`,
  ],
  ['ai', 'Please find the JSON object below:'],
]);

export const KV_ERROR_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant on Elasticsearch Ingest Pipelines, focusing on resolving errors and issues with append processors used for related field categorization.
Here is some context that you can reference for your task, read it carefully as you will get questions about it later:
<context>
<current_processor>
{current_processor}
</current_processor>
<common_errors>
{common_errors}
</common_errors>
</context>`,
  ],
  [
    'human',
    `Please go through each error below, carefully review the provided current kv processor, and resolve the most likely cause to the supplied error by returning an updated version of the current_processor.

<errors>
{errors}
</errors>
  
Follow these steps to help resolve the current ingest pipeline issues:
1. Check first if any of the errors are similar to the common errors provided above, if one is found follow the recommended action.
2. When multiple errors are involved, try to resolve them all one by one.
3. If this is not a common error, analyze the error message and the current processor to identify the root cause.
4. Recognize and properly format different data types such as strings, numbers, and timestamps and handle quoted values correctly.
5. The \`value_split\` is the delimeter regex pattern to use for splitting the key from the value within a key-value pair (e.g., ':' or '=' )
6. The \`field_split\` is the regex pattern to use for splitting key-value pairs in the log. Make sure the regex pattern breaks the log into key-value pairs.
7. Ensure that the KV processor can handle different scenarios, such as: Optional or missing fields in the logs , Varying delimiters between keys and values (e.g., = or :), Complex log structures (e.g., nested key-value pairs or key-value pairs within strings, whitespaces , urls, ipv4 , ipv6 address, mac address etc.,). 
8. Apply the relevant changes to the current processors and return the updated version.

You ALWAYS follow these guidelines when writing your response:
<guidelines>
- Do not use the special characters like \`\s\` or \`\\s+\` in the \`field_split\` or \`value_split\` regular expressions.
- Always use single backslash (\\) for escaping characters in \`field_split\` or \`value_split\` regular expressions.
- Do not add brackets (), <>, [] as well as single or double quotes in \`trim_value\`.
- Do not add multiple delimeters in the \`value_split\` regular expression.
- Make sure to trim whitespaces in \`trim_key\`. 
- Do not respond with anything except the complete updated processor as a valid JSON object enclosed with 3 backticks (\`), see example response below.
</guidelines>

Example response format:
<example>
A: Please find the updated KV processor below:
\`\`\`json
{ex_answer}
\`\`\`
</example>`,
  ],
  ['ai', 'Please find the updated KV processor below:'],
]);
