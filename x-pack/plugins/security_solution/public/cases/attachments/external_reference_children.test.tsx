/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import AttachmentContentChildren from './external_reference_children';

describe('AttachmentContentChildren', () => {
  it('renders markdown content when comment exists', () => {
    const props = {
      externalReferenceMetadata: {
        comment: 'Test comment',
      },
    };
    const { getByText } = render(<AttachmentContentChildren {...props} />);
    expect(getByText('Test comment')).toBeInTheDocument();
  });

  it('does not render when comment is empty', () => {
    const props = {
      externalReferenceMetadata: {
        comment: '',
        command: 'isolate',
      },
    };
    const { container } = render(<AttachmentContentChildren {...props} />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when comment is only whitespace', () => {
    const props = {
      externalReferenceMetadata: {
        comment: '   ',
        command: 'isolate',
      },
    };

    const { container } = render(<AttachmentContentChildren {...props} />);
    expect(container.firstChild).toBeNull();
  });
});
