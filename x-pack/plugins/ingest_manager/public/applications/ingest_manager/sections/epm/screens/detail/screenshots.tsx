/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiImage, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { ScreenshotItem } from '../../../../types';
import { useLinks } from '../../hooks';

interface ScreenshotProps {
  images: ScreenshotItem[];
}

const getHorizontalPadding = (styledProps: any): number =>
  parseInt(styledProps.theme.eui.paddingSizes.xl, 10) * 2;
const getVerticalPadding = (styledProps: any): number =>
  parseInt(styledProps.theme.eui.paddingSizes.xl, 10) * 1.75;
const getPadding = (styledProps: any) =>
  styledProps.hascaption
    ? `${styledProps.theme.eui.paddingSizes.xl} ${getHorizontalPadding(
        styledProps
      )}px ${getVerticalPadding(styledProps)}px`
    : `${getHorizontalPadding(styledProps)}px ${getVerticalPadding(styledProps)}px`;
const ScreenshotsContainer = styled(EuiFlexGroup)`
  background: linear-gradient(360deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0) 100%),
    ${(styledProps) => styledProps.theme.eui.euiColorPrimary};
  padding: ${(styledProps) => getPadding(styledProps)};
  flex: 0 0 auto;
  border-radius: ${(styledProps) => styledProps.theme.eui.euiBorderRadius};
`;

// fixes ie11 problems with nested flex items
const NestedEuiFlexItem = styled(EuiFlexItem)`
  flex: 0 0 auto !important;
`;

export function Screenshots(props: ScreenshotProps) {
  const { toImage } = useLinks();
  const { images } = props;

  // for now, just get first image
  const image = images[0];
  const hasCaption = image.title ? true : false;

  return (
    <Fragment>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.ingestManager.epm.screenshotsTitle"
            defaultMessage="Screenshots"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <ScreenshotsContainer
        gutterSize="none"
        direction="column"
        alignItems="center"
        {...(hasCaption ? { hascaption: 'true' } : {})}
      >
        {hasCaption && (
          <NestedEuiFlexItem>
            <EuiText color="ghost" aria-label="screenshot image caption">
              {image.title}
            </EuiText>
            <EuiSpacer />
          </NestedEuiFlexItem>
        )}
        <NestedEuiFlexItem>
          {/* By default EuiImage sets width to 100% and Figure to 22.5rem for size=l images,
              set image to same width.  Will need to update if size changes.
            */}
          <EuiImage
            url={toImage(image.src)}
            alt="screenshot image preview"
            size="l"
            allowFullScreen
            style={{ width: '22.5rem', maxWidth: '100%' }}
          />
        </NestedEuiFlexItem>
      </ScreenshotsContainer>
    </Fragment>
  );
}
