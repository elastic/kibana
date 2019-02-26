/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { px, units } from '../../../../../../../style/variables';
// @ts-ignore
import { Ellipsis } from '../../../../../../shared/Icons';

const ToggleButtonContainer = styled.div`
  margin-top: ${px(units.half)};
  user-select: none;
`;

interface Props {
  previewHeight: string;
}

export const TruncateHeightSection: React.SFC<Props> = ({
  children,
  previewHeight
}) => {
  const [isTruncated, setIsTruncated] = useState(true);
  const [isContentClipping, setIsContentClipping] = useState(true);
  const [forcedStaticHeight, setForcedStaticHeight] = useState(true);
  const contentContainerEl = useRef<HTMLDivElement>(null);

  useEffect(
    () => {
      setForcedStaticHeight(true);
    },
    [children, previewHeight]
  );

  useEffect(
    () => {
      if (forcedStaticHeight) {
        if (contentContainerEl.current) {
          setIsContentClipping(
            contentContainerEl.current.scrollHeight >
              contentContainerEl.current.clientHeight
          );
        }
        setForcedStaticHeight(false);
      }
    },
    [forcedStaticHeight]
  );

  return (
    <Fragment>
      <div
        ref={contentContainerEl}
        style={{
          overflow: 'hidden',
          height:
            forcedStaticHeight || (isContentClipping && isTruncated)
              ? previewHeight
              : 'auto'
        }}
      >
        {children}
      </div>
      {isContentClipping ? (
        <ToggleButtonContainer>
          <EuiLink
            onClick={() => {
              setIsTruncated(!isTruncated);
            }}
          >
            <Ellipsis
              horizontal={!isTruncated}
              style={{ marginRight: units.half }}
            />{' '}
            {isTruncated
              ? i18n.translate('xpack.apm.toggleHeight.showMoreButtonLabel', {
                  defaultMessage: 'Show more lines'
                })
              : i18n.translate('xpack.apm.toggleHeight.showLessButtonLabel', {
                  defaultMessage: 'Show fewer lines'
                })}
          </EuiLink>
        </ToggleButtonContainer>
      ) : null}
    </Fragment>
  );
};
