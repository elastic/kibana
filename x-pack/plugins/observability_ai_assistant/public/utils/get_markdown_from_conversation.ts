/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatDate } from '@elastic/eui';
import { Message } from '../../common';
import { getRoleTranslation } from './get_role_translation';

export function getMarkdownFromConversation({
  title,
  messages,
}: {
  title: string;
  messages: Message[];
}) {
  return messages.reduce(
    (acc, curr) => {
      return `${acc}
        **${getRoleTranslation(curr.message.role)} - ${formatDate(curr['@timestamp'], 'hh:mm A')}**
        ${
          curr.message.content
            ? curr.message.name
              ? `_responded with function response:_
  \`\`\`${curr.message.content}\`\`\``
              : curr.message.content
            : ''
        }${
        curr.message.function_call?.name
          ? `_Requested function '${curr.message.function_call.name}'_`
          : ''
      }${
        curr.message.function_call?.arguments
          ? ` _with payload:_
  \`\`\`${JSON.stringify(curr.message.function_call?.arguments)}\`\`\``
          : ''
      }
  
        -----      
        `;
    },
    `# ${title} - ${formatDate(messages.at(0)?.['@timestamp'], 'DD MMM YYYY hh:mm A')}
      `
  );
}
