/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { forwardRef } from 'react';
import styled from 'styled-components';
import { OutPortal } from 'react-reverse-portal';

import {
  useGlobalFullScreen,
  useTimelineFullScreen,
} from '../../../common/containers/use_full_screen';
import { MlPopover } from '../../../common/components/ml_popover/ml_popover';
import * as i18n from './translations';
import { useKibana } from '../../../common/lib/kibana';
import { ADD_DATA_PATH, APP_DETECTIONS_PATH } from '../../../../common/constants';
import { useGlobalHeaderPortal } from '../../../common/hooks/use_global_header_portal';

const Wrapper = styled.header<{ $isFixed: boolean }>`
  ${({ theme, $isFixed }) => `
    background: ${theme.eui.euiColorEmptyShade};
    border-bottom: ${theme.eui.euiBorderThin};
    z-index: ${theme.eui.euiZNavigation};
    position: relative;
    ${
      $isFixed
        ? `
    left: 240px;
    position: fixed;
    right: 0;
    width: calc(100% - 240px);
    `
        : ''
    }
  `}
`;
Wrapper.displayName = 'Wrapper';

const WrapperContent = styled.div<{ $globalFullScreen: boolean }>`
  display: ${({ $globalFullScreen }) => ($globalFullScreen ? 'none' : 'block')};
  padding-top: ${({ $globalFullScreen, theme }) =>
    $globalFullScreen ? theme.eui.paddingSizes.s : theme.eui.paddingSizes.m};
`;

WrapperContent.displayName = 'WrapperContent';

const FlexItem = styled(EuiFlexItem)`
  min-width: 0;
`;
FlexItem.displayName = 'FlexItem';

interface HeaderGlobalProps {
  isFixed?: boolean;
}

export const HeaderGlobal = React.memo(
  forwardRef<HTMLDivElement, HeaderGlobalProps>(({ isFixed = true }, ref) => {
    const { globalHeaderPortalNode } = useGlobalHeaderPortal();
    const { globalFullScreen } = useGlobalFullScreen();
    const { timelineFullScreen } = useTimelineFullScreen();
    const { http } = useKibana().services;

    const basePath = http.basePath.get();
    return (
      <Wrapper ref={ref} $isFixed={isFixed}>
        <WrapperContent $globalFullScreen={globalFullScreen ?? timelineFullScreen}>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="flexEnd"
            gutterSize="s"
            responsive={false}
            wrap
          >
            {window.location.pathname.includes(APP_DETECTIONS_PATH) && (
              <FlexItem grow={false}>
                <MlPopover />
              </FlexItem>
            )}

            <FlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="add-data"
                href={`${basePath}${ADD_DATA_PATH}`}
                iconType="plusInCircle"
              >
                {i18n.BUTTON_ADD_DATA}
              </EuiButtonEmpty>
            </FlexItem>
          </EuiFlexGroup>
        </WrapperContent>
        <OutPortal node={globalHeaderPortalNode} />
      </Wrapper>
    );
  })
);
HeaderGlobal.displayName = 'HeaderGlobal';
