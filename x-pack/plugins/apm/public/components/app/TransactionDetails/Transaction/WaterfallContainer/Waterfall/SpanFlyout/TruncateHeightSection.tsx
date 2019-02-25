/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { idx } from 'x-pack/plugins/apm/common/idx';
import { px, units } from '../../../../../../../style/variables';
// @ts-ignore
import { Ellipsis } from '../../../../../../shared/Icons';

const ToggleButtonContainer = styled.div`
  margin-top: ${px(units.half)};
  user-select: none;
`;

const ContentContainer = styled.div`
  overflow: hidden;
`;

interface Props {
  previewHeight: string;
}

export const TruncateHeightSection: React.SFC<Props> = props => {
  const [isTruncated, setIsTruncated] = useState(true);
  const [showToggle, setShowToggle] = useState(false);
  const contentContainerEl = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollHeight =
      idx(contentContainerEl, _ => _.current.scrollHeight) || 0;
    const clientHeight =
      idx(contentContainerEl, _ => _.current.clientHeight) || 0;
    if (scrollHeight > clientHeight) {
      setShowToggle(true);
    } else {
      setIsTruncated(false);
    }
  });

  return (
    <Fragment>
      <ContentContainer
        innerRef={contentContainerEl}
        style={{
          height: isTruncated ? props.previewHeight : 'auto'
        }}
      >
        {props.children}
      </ContentContainer>
      {showToggle ? (
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
