/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ComponentStory } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { css } from '@emotion/react';
import * as bh from 'blurhash';

import { Image, Props } from './image';
import { base64dLogo } from './image.constants.stories';

const defaultSrc = `data:image/png;base64,${base64dLogo}`;
const blurhash = (function encodeImageToBlurhash() {
  const image = new window.Image(900, 500);
  image.src = defaultSrc;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, image.width, image.height);
  return bh.encode(imageData.data, imageData.width, imageData.height, 4, 4);
})();
const defaultArgs: Props = { alt: 'test', src: defaultSrc };

export default {
  title: 'components/Image',
  component: Image,
  args: defaultArgs,
};

const baseStyle = css`
  width: 400px;
`;

const Template: ComponentStory<typeof Image> = (props: Props) => (
  <Image css={baseStyle} {...props} ref={action('ref')} />
);

export const Basic = Template.bind({});

export const BrokenSrc = Template.bind({});
BrokenSrc.args = {
  src: 'broken',
};

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
