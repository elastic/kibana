/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Document } from 'langchain/document';

/**
 * Transforms a set of documents by adding metadata that indicates those documents are required
 *
 * An additional property, `metadata`, is added to each document if it doesn't already exist.
 *
 * The `metadata` property is an object that contains the following properties:
 * - the original metadata properties of the document (when they exist)
 * - `kbResource`: The name of the Knowledge Base resource that the document belongs to
 * - `required`: A boolean indicating whether the document is required for searches on the kbResource topic
 *
 * @returns A transformed set of documents, such that each document has the required metadata
 */
export const addRequiredKbResourceMetadata = ({
  docs,
  kbResource,
}: {
  docs: Array<Document<Record<string, unknown>>>;
  kbResource: string;
}): Array<Document<Record<string, unknown>>> =>
  docs.map((doc) => ({
    ...doc,
    metadata: {
      ...doc.metadata,
      kbResource,
      required: true, // indicates that the document is required for searches on the kbResource topic
    },
  }));
