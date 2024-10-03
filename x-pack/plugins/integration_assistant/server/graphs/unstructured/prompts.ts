/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ChatPromptTemplate } from '@langchain/core/prompts';

export const GROK_MAIN_PROMPT = ChatPromptTemplate.fromMessages([
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
    `Looking at the multiple syslog samples provided in the context, You are tasked with identifying the appropriate regex and Grok pattern for a set of syslog samples.
    Your goal is to accurately extract key components such as timestamps, hostnames, priority levels, process names, events, VLAN information, MAC addresses, IP addresses, STP roles, port statuses, messages and more.

 Follow these steps to help improve the grok patterns and apply it step by step:
  1. Familiarize yourself with various syslog message formats.
  2. PRI (Priority Level): Encoded in angle brackets, e.g., <134>, indicating the facility and severity.
  3. Timestamp: Use \`SYSLOGTIMESTAMP\` for RFC 3164 timestamps (e.g., Aug 10 16:34:02). Use \`TIMESTAMP_ISO8601\` for ISO 8601 (RFC 5424) timestamps. For epoch time, use \`NUMBER\`.
  4. If the timestamp could not be categorized into a predefined format, extract the date time fields separately and combine them with the format identified in the grok pattern.
  5. Make sure to identify the timezone component in the timestamp.
  6. Hostname/IP Address: The system or device that generated the message, which could be an IP address or fully qualified domain name
  7. Process Name and PID: Often included with brackets, such as sshd[1234].
  8. VLAN information: Usually in the format of VLAN: 1234.
  9. MAC Address: The network interface MAC address.
  10. Port number: The port number on the device.
  11. Look for status codes ,interface ,log type, source ,User action, destination, protocol, etc.
  12. message: This is the free-form message text that varies widely across log entries.


 You ALWAYS follow these guidelines when writing your response:
 <guidelines>
 - Make sure to map the remaining message part to \'message\' in grok pattern.
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

export const GROK_ERROR_PROMPT = ChatPromptTemplate.fromMessages([
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

Follow these steps to help improve the grok patterns and apply it step by step:
  1. Familiarize yourself with various syslog message formats.
  2. PRI (Priority Level): Encoded in angle brackets, e.g., <134>, indicating the facility and severity.
  3. Timestamp: Use \`SYSLOGTIMESTAMP\` for RFC 3164 timestamps (e.g., Aug 10 16:34:02). Use \`TIMESTAMP_ISO8601\` for ISO 8601 (RFC 5424) timestamps. For epoch time, use \`NUMBER\`.
  4. If the timestamp could not be categorized into a predefined format, extract the date time fields separately and combine them with the format identified in the grok pattern.
  5. Make sure to identify the timezone component in the timestamp.
  6. Hostname/IP Address: The system or device that generated the message, which could be an IP address or fully qualified domain name
  7. Process Name and PID: Often included with brackets, such as sshd[1234].
  8. VLAN information: Usually in the format of VLAN: 1234.
  9. MAC Address: The network interface MAC address.
  10. Port number: The port number on the device.
  11. Look for status codes ,interface ,log type, source ,User action, destination, protocol, etc.
  12. message: This is the free-form message text that varies widely across log entries.

 You ALWAYS follow these guidelines when writing your response:
 <guidelines>
 - Make sure to map the remaining message part to \'message\' in grok pattern.
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
