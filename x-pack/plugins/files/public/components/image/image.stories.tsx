/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ComponentStory } from '@storybook/react';
import { css } from '@emotion/react';
import { Image, Props } from './image';
import { base64dLogo } from './image.constants.stories';

const defaultArgs = { alt: 'my alt text', src: `data:image/png;base64,${base64dLogo}` };

export default {
  title: 'components/Image',
  component: Image,
  args: defaultArgs,
};

const baseStyle = css`
  width: 400px;
`;

const Template: ComponentStory<typeof Image> = (props: Props) => (
  <Image css={baseStyle} {...props} />
);

export const Basic = Template.bind({});

export const BrokenSrc = Template.bind({});
BrokenSrc.args = {
  src: 'broken',
};

export const OffScreen = Template.bind({});
// eslint-disable-next-line no-console
OffScreen.args = { ...defaultArgs, onFirstVisible: () => console.log('yeah!') };
OffScreen.decorators = [
  (Story) => (
    <div
      css={css`
        margin-top: 100vh;
      `}
    >
      <Story />
    </div>
  ),
];
