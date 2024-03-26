/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessage, Message, MessageRole, UseChatHelpers } from '../types';
import { transformAnnotationToDoc } from './transform_annotation_to_doc';

export const transformFromChatMessages = (messages: UseChatHelpers['messages']): Message[] =>
  messages.map(({ id, content, createdAt, role, annotations }) => {
    const commonMessageProp = {
      id,
      content,
      createdAt,
      role: role === MessageRole.assistant ? MessageRole.assistant : MessageRole.user,
    };

    if (role === MessageRole.assistant) {
      return {
        ...commonMessageProp,
        citations: Array.isArray(annotations)
          ? annotations
              .find((annotation) => annotation.type === 'citations')
              ?.documents?.map(transformAnnotationToDoc)
          : [],
        retrievalDocs: Array.isArray(annotations)
          ? annotations
              .find((annotation) => annotation.type === 'retrieved_docs')
              ?.documents?.map(transformAnnotationToDoc)
          : [],
      } as AIMessage;
    }

    return commonMessageProp;
  });
