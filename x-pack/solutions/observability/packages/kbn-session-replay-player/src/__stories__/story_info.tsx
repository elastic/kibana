/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Decorator } from '@storybook/react';
import {
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
} from '@elastic/eui';
import { STORY_INFO } from './story_info_content';
import type { StoryInfoContent } from './story_info_content';

const StoryInfoButton = ({ info }: { info: StoryInfoContent }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div style={{ marginTop: 8 }}>
        <EuiButtonEmpty
          size="s"
          iconType="info"
          onClick={() => setIsOpen(true)}
          data-test-subj="storyInfoButton"
        >
          What is this story about?
        </EuiButtonEmpty>
      </div>
      {isOpen && (
        <EuiModal
          onClose={() => setIsOpen(false)}
          aria-labelledby="storyInfoTitle"
          data-test-subj="storyInfoDialog"
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id="storyInfoTitle">What is this story about?</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText size="s">
              <p>{info.about}</p>
              <h4>What to notice</h4>
              <ul>
                {info.notice.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {info.controls && (
                <>
                  <h4>Controls</h4>
                  <ul>
                    {info.controls.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </>
              )}
            </EuiText>
          </EuiModalBody>
        </EuiModal>
      )}
    </>
  );
};

/** Adds a "What is this story about?" button to every story that has an entry in `STORY_INFO`. */
export const withStoryInfo: Decorator = (Story, { id }) => {
  const info = STORY_INFO[id.split('--')[1]];
  return (
    <>
      <Story />
      {info && <StoryInfoButton info={info} />}
    </>
  );
};
