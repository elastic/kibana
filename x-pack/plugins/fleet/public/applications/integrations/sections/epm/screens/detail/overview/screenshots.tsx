/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo, memo } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiImage, EuiText, EuiPagination } from '@elastic/eui';

import type { ScreenshotItem } from '../../../../../types';
import { useLinks } from '../../../../../hooks';

interface ScreenshotProps {
  images: ScreenshotItem[];
  packageName: string;
  version: string;
}
const Pagination = styled(EuiPagination)`
  max-width: 130px;
`;

export const Screenshots: React.FC<ScreenshotProps> = memo(({ images, packageName, version }) => {
  const { toPackageImage } = useLinks();
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const maxImageIndex = useMemo(() => images.length - 1, [images.length]);
  const currentImageUrl = useMemo(
    () => toPackageImage(images[currentImageIndex], packageName, version),
    [currentImageIndex, images, packageName, toPackageImage, version]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {/* Title with carousel navigation */}
      <EuiFlexItem>
        <EuiFlexGroup
          direction="row"
          alignItems="center"
          gutterSize="xs"
          justifyContent="spaceBetween"
        >
          <EuiFlexItem grow={false}>
            <EuiText>
              <h4>
                <FormattedMessage
                  id="xpack.fleet.epm.screenshotsTitle"
                  defaultMessage="Screenshots"
                />
              </h4>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <Pagination
              aria-label={i18n.translate('xpack.fleet.epm.screenshotPaginationAriaLabel', {
                defaultMessage: '{packageName} screenshot pagination',
                values: {
                  packageName,
                },
              })}
              pageCount={maxImageIndex + 1}
              activePage={currentImageIndex}
              onPageClick={(activePage) => setCurrentImageIndex(activePage)}
              compressed
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Current screenshot */}
      <EuiFlexItem>
        {currentImageUrl ? (
          <EuiImage
            allowFullScreen
            hasShadow
            alt={
              images[currentImageIndex].title ||
              i18n.translate('xpack.fleet.epm.screenshotAltText', {
                defaultMessage: '{packageName} screenshot #{imageNumber}',
                values: {
                  packageName,
                  imageNumber: currentImageIndex + 1,
                },
              })
            }
            title={images[currentImageIndex].title}
            url={currentImageUrl}
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.epm.screenshotErrorText"
            defaultMessage="Unable to load this screenshot"
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
