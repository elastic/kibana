/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import AttachmentContent from './external_reference_children';
import { EuiMarkdownFormat } from '@elastic/eui';

describe('AttachmentContent', () => {
  it('renders markdown content when comment exists', () => {
    const props = {
      externalReferenceMetadata: {
        comment: 'Some **markdown** content',
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
    const wrapper = shallow(<AttachmentContent {...props} />);
    expect(wrapper.find(EuiMarkdownFormat).prop('children')).toEqual('Some **markdown** content');
  });

  it('does not render when comment is empty', () => {
    const props = {
      externalReferenceMetadata: {
        comment: '',
        command: 'isolate',
      },
    };
    const wrapper = shallow(<AttachmentContent {...props} />);
    expect(wrapper.type()).toBeNull();
  });

  it('does not render when comment is only whitespace', () => {
    const props = {
      externalReferenceMetadata: {
        comment: '   ',
        command: 'isolate',
      },
    };

    const wrapper = shallow(<AttachmentContent {...props} />);
    expect(wrapper.type()).toBeNull();
  });
});
