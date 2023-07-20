/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiCommentList, EuiComment, EuiCode, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Message, MessageRole } from '../../../common/types';
import { useCurrentUser } from '../../hooks/use_current_user';
import { ChatAvatar } from './chat_avatar';

export interface ChatTimelineProps {
  messages: Message[];
}

export function ChatTimeline({ messages = [] }: ChatTimelineProps) {
  const currentUser = useCurrentUser();

  return (
    <EuiCommentList>
      {messages.map((message, index) => (
        <EuiComment
          username={i18n.translate(
            'xpack.observabilityAiAssistant.chatTimeline.messages.userInitiatedTitle.you',
            { defaultMessage: 'You' }
          )}
          event={
            index === 0 && message.message.role === MessageRole.User
              ? i18n.translate(
                  'xpack.observabilityAiAssistant.chatTimeline.messages.userInitiatedTitle.createdNewConversation',
                  {
                    defaultMessage: 'created a new conversation',
                  }
                )
              : null
          }
          timelineAvatar={<ChatAvatar user={currentUser} role={message.message.role} />}
        >
          {message.message.role === MessageRole.User && index === 0 ? (
            <EuiText size="s">
              <p>{message.message.content}</p>
            </EuiText>
          ) : (
            <EuiPanel
              hasBorder
              css={{
                backgroundColor: message.message.role !== MessageRole.User ? '#F1F4FA' : '#fff',
              }}
              paddingSize="s"
            >
              <p>{message.message.content}</p>
            </EuiPanel>
          )}
        </EuiComment>
      ))}
    </EuiCommentList>
  );
}

// <EuiTimeline>
//   {messages.map((message, index) => (
//     <EuiTimelineItem
//       key={index}
//       verticalAlign="top"
//       icon={<EuiAvatar name="Checked" iconType="check" />}
//     >
//       <EuiSplitPanel.Outer color="transparent" hasBorder grow>
//         {message.message.role === MessageRole.User && index === 0 ? (
//           <>
//             <EuiSplitPanel.Inner css={{ backgroundColor: lightGreyBgColor }} paddingSize="s">
//               <EuiText size="s">
//                 <p>
//                   <strong>
//                     {i18n.translate(
//                       'xpack.observabilityAiAssistant.chatTimeline.messages.userInitiatedTitle.you',
//                       { defaultMessage: 'You' }
//                     )}{' '}
//                   </strong>
//                   {i18n.translate(
//                     'xpack.observabilityAiAssistant.chatTimeline.messages.userInitiatedTitle.createdNewConversation',
//                     {
//                       defaultMessage: 'created a new conversation',
//                     }
//                   )}
//                 </p>
//               </EuiText>
//             </EuiSplitPanel.Inner>
//             <EuiHorizontalRule margin="none" />
//           </>
//         ) : null}

//         <EuiSplitPanel.Inner
//           css={{
//             backgroundColor:
//               message.message.role === MessageRole.User ? 'white' : lightGreyBgColor,
//           }}
//           paddingSize="s"
//         >
//           <EuiText grow={false} size="s">
//             <p>{message.message.content}</p>
//           </EuiText>
//         </EuiSplitPanel.Inner>
//       </EuiSplitPanel.Outer>
//     </EuiTimelineItem>
//   ))}
// </EuiTimeline>
