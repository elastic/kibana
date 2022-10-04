/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { css } from '@emotion/react';

import { FilesContext } from '../context';
import { createBlurhash } from '../common';
import { Image, Props } from './image';
import { getImageData as getBlob, base64dLogo } from './image.constants.stories';

const defaultArgs: Props = { alt: 'test', src: `data:image/png;base64,${base64dLogo}` };

export default {
  title: 'components/Image',
  component: Image,
  args: defaultArgs,
  decorators: [
    (Story) => (
      <FilesContext>
        <Story />
      </FilesContext>
    ),
  ],
} as ComponentMeta<typeof Image>;

const baseStyle = css`
  width: 400px;
  height: 200px;
`;

const Template: ComponentStory<typeof Image> = (props: Props) => (
  <Image css={baseStyle} {...props} ref={action('ref')} />
);

export const Basic = Template.bind({});

export const WithBlurhash = Template.bind({});

export const BrokenSrc = Template.bind({});
BrokenSrc.decorators = [
  (Story) => {
    return (
      <FilesContext
        http={
          {
            get: () => {
              throw new Error('Nope!');
            },
          } as unknown as HttpSetup
        }
      >
        <Story />
      </FilesContext>
    );
  },
];

export const OffScreen = Template.bind({});
OffScreen.args = { ...defaultArgs, onFirstVisible: action('visible') };
OffScreen.decorators = [
  (Story) => (
    <>
      <p>Scroll down</p>
      <div
        css={css`
          margin-top: 100vh;
        `}
      >
        <Story />
      </div>
    </>
  ),
];
