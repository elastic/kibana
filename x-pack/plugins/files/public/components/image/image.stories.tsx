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
import { getImageMetadata } from '../common';
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

const Template: ComponentStory<typeof Image> = (props: Props, { loaded: { blurhash } }) => (
  <Image css={baseStyle} {...props} blurhash={blurhash} ref={action('ref')} />
);

export const Basic = Template.bind({});

export const WithBlurhash = Template.bind({});
WithBlurhash.storyName = 'With blurhash';
WithBlurhash.args = {
  style: { opacity: 0 },
};
WithBlurhash.loaders = [
  async () => ({
    blurhash: await getImageMetadata(getBlob()),
  }),
];
WithBlurhash.decorators = [
  (Story) => {
    const alwaysShowBlurhash = `canvas { opacity: 1 !important; }`;
    return (
      <>
        <style>{alwaysShowBlurhash}</style>
        <Story />
      </>
    );
  },
];

export const BrokenSrc = Template.bind({});
BrokenSrc.storyName = 'Broken src';
BrokenSrc.args = {
  src: 'foo',
};

export const WithBlurhashAndBrokenSrc = Template.bind({});
WithBlurhashAndBrokenSrc.storyName = 'With blurhash and broken src';
WithBlurhashAndBrokenSrc.args = {
  src: 'foo',
};
WithBlurhashAndBrokenSrc.loaders = [
  async () => ({
    blurhash: await getImageMetadata(getBlob()),
  }),
];

export const OffScreen = Template.bind({});
OffScreen.storyName = 'Offscreen';
OffScreen.args = { onFirstVisible: action('visible') };
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
