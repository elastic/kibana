/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteInferenceEndpoint } from './delete_inference_endpoint';

describe('deleteInferenceEndpoint', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      inference: {
        delete: jest.fn(),
      },
    };
  });

  it('should call the Elasticsearch client with the correct DELETE request', async () => {
    const type = 'rerank';
    const id = 'model-id-123';

    await deleteInferenceEndpoint(mockClient, type, id);

    expect(mockClient.inference.delete).toHaveBeenCalledWith({
      inference_id: id,
      task_type: type,
    });
  });
});
