/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import AttachmentContent from './external_reference_children';

describe('AttachmentContent', () => {
  it('renders markdown content when comment exists', () => {
    const props = {
      externalReferenceMetadata: {
        comment: 'Test comment',
        command: 'isolate',
        targets: [
          {
            endpointId: 'endpoint-1',
            hostname: 'host-1',
            type: 'endpoint',
          },
        ],
      },
    };
    const { getByText } = render(<AttachmentContent {...props} />);
    expect(getByText('Test comment')).toBeInTheDocument();
  });

  it('does not render when comment is empty', () => {
    const props = {
      externalReferenceMetadata: {
        comment: '',
        command: 'isolate',
      },
    };
    const { container } = render(<AttachmentContent {...props} />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when comment is only whitespace', () => {
    const props = {
      externalReferenceMetadata: {
        comment: '   ',
        command: 'isolate',
      },
    };

    const { container } = render(<AttachmentContent {...props} />);
    expect(container.firstChild).toBeNull();
  });
});
