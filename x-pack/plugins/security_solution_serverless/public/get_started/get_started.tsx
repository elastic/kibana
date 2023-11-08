/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiTitle,
  useEuiTheme,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiOverlayMask,
  EuiFocusTrap,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { css } from '@emotion/react';
import { TogglePanel } from './toggle_panel';
import {
  GET_STARTED_PAGE_DESCRIPTION,
  GET_STARTED_PAGE_SUBTITLE,
  GET_STARTED_PAGE_TITLE,
  PROGRESS_TRACKER_LABEL,
  WATCH_OVERVIEW_VIDEO_CLOSE_BUTTON_TITLE,
  WATCH_OVERVIEW_VIDEO_DESCRIPTION,
  WATCH_OVERVIEW_VIDEO_HEADER,
  WATCH_OVERVIEW_VIDEO_MODAL_HEADER,
} from './translations';
import type { SecurityProductTypes } from '../../common/config';
import { useTogglePanel } from './use_toggle_panel';
import { ProductLine } from '../../common/product';
import { useKibana } from '../common/services';
import launch from './images/launch.png';
import { ProductTierBadge } from './welcome_panel/product_tier_badge';
import { ChangePlanLink } from './welcome_panel/change_plan_link';
import { getTotalCardsNumber } from './helpers';
import { ModalContextProvider } from '../common/hooks/modal_context';

const CONTENT_WIDTH = 1150;

export interface GetStartedProps {
  productTypes: SecurityProductTypes;
}

export const GetStartedComponent: React.FC<GetStartedProps> = ({ productTypes }) => {
  const { euiTheme } = useEuiTheme();
  const [maskOpen, changeMask] = useState(false);
  const closeModal = useCallback(() => changeMask(false), []);
  const openModal = useCallback(() => changeMask(true), []);

  const {
    state: { finishedCards },
    toggleFinishedCard,
  } = useTogglePanel();

  const modalContext = useMemo(
    () => ({ openModal, closeModal, toggleFinishedCard }),
    [closeModal, openModal, toggleFinishedCard]
  );
  const [userName, setUserName] = useState<string>();
  const {
    services: {
      security: { authc },
    },
  } = useKibana();

  useEffect(() => {
    const getUser = async () => {
      const { username } = await authc.getCurrentUser();
      setUserName(username);
    };

    getUser();
  });
  const productTier = productTypes.find(
    (product) => product.product_line === ProductLine.security
  )?.product_tier;

  return (
    <ModalContextProvider context={modalContext}>
      <KibanaPageTemplate
        restrictWidth={false}
        contentBorder={false}
        grow={true}
        /* this is the only page without padding in Security Solution,
         **  ignoring main page wrapper padding using absolute positioning
         */
        css={css`
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          position: absolute;
        `}
      >
        <KibanaPageTemplate.Section
          restrictWidth={CONTENT_WIDTH}
          css={css`
            padding: 0 ${euiTheme.base * 2.25}px;
          `}
        >
          <EuiFlexGroup
            css={css`
              background-image: url(${launch});
              background-size: 40%;
              background-repeat: no-repeat;
              background-position-x: right;
              background-position-y: center;
            `}
          >
            <EuiFlexItem
              grow={false}
              css={css`
                width: ${CONTENT_WIDTH / 2}px;
              `}
            >
              <EuiTitle
                size="l"
                css={css`
                  padding-left: ${euiTheme.size.xs};
                  padding-bottom: ${euiTheme.size.l};
                `}
              >
                <>
                  {userName && (
                    <span
                      css={css`
                        font-size: ${euiTheme.size.l};
                        color: ${euiTheme.colors.darkShade};
                        font-weight: ${euiTheme.font.weight.bold};
                      `}
                    >
                      {GET_STARTED_PAGE_TITLE(userName)}
                    </span>
                  )}
                  <EuiSpacer size="m" />
                </>
              </EuiTitle>
              <span
                css={css`
                  font-size: ${euiTheme.base * 2.125}px;
                  color: ${euiTheme.colors.title};
                  font-weight: ${euiTheme.font.weight.bold};
                `}
                className="eui-displayBlock"
              >
                {GET_STARTED_PAGE_SUBTITLE}
              </span>
              <EuiSpacer size="m" />
              <span
                className="eui-displayBlock"
                css={css`
                  font-size: ${euiTheme.base}px;
                  color: ${euiTheme.colors.darkShade};
                  line-height: ${euiTheme.size.l};
                `}
              >
                {GET_STARTED_PAGE_DESCRIPTION}
              </span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </KibanaPageTemplate.Section>
        <KibanaPageTemplate.Section
          restrictWidth={CONTENT_WIDTH}
          css={css`
            background-color: ${euiTheme.colors.lightestShade};
          `}
        >
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={true}>
                <EuiProgress
                  value={finishedCards.size}
                  max={getTotalCardsNumber()}
                  size="m"
                  label={PROGRESS_TRACKER_LABEL}
                  valueText={<>{`${finishedCards.size}/${getTotalCardsNumber()}`}</>}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ProductTierBadge productTier={productTier} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ChangePlanLink productTier={productTier} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        </KibanaPageTemplate.Section>

        <KibanaPageTemplate.Section
          bottomBorder="extended"
          grow={true}
          restrictWidth={CONTENT_WIDTH}
          paddingSize="none"
          css={css`
            padding: 0 ${euiTheme.base * 2.25}px;
            background-color: ${euiTheme.colors.lightestShade};
          `}
        >
          <TogglePanel finishedCards={finishedCards} />
        </KibanaPageTemplate.Section>
        {maskOpen ? (
          <EuiOverlayMask>
            <EuiFocusTrap onClickOutside={closeModal}>
              <EuiModal
                onClose={closeModal}
                css={css`
                  width: 603px;
                `}
              >
                <EuiModalHeader
                  css={css`
                    justify-content: center;
                  `}
                >
                  <EuiModalHeaderTitle>{WATCH_OVERVIEW_VIDEO_MODAL_HEADER}</EuiModalHeaderTitle>
                </EuiModalHeader>
                <EuiModalBody>
                  <div
                    css={css`
                      width: 100%;
                      height: 262.88px;
                    `}
                  >
                    <iframe
                      allowFullScreen
                      className="vidyard_iframe"
                      frameBorder="0"
                      height="100%"
                      width="100%"
                      referrerPolicy="no-referrer"
                      sandbox="allow-scripts allow-same-origin"
                      scrolling="no"
                      src="//play.vidyard.com/K6kKDBbP9SpXife9s2tHNP.html?"
                      title={WATCH_OVERVIEW_VIDEO_HEADER}
                    />
                  </div>
                </EuiModalBody>
                <EuiModalFooter>
                  <EuiFlexGroup direction="column">
                    <EuiFlexItem
                      css={css`
                        line-height: ${euiTheme.size.l};
                      `}
                    >
                      {WATCH_OVERVIEW_VIDEO_DESCRIPTION}
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiButton onClick={closeModal}>
                        {WATCH_OVERVIEW_VIDEO_CLOSE_BUTTON_TITLE}
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiModalFooter>
              </EuiModal>
            </EuiFocusTrap>
          </EuiOverlayMask>
        ) : undefined}
      </KibanaPageTemplate>
    </ModalContextProvider>
  );
};

GetStartedComponent.displayName = 'GetStartedComponent';
export const GetStarted = React.memo(GetStartedComponent);

// eslint-disable-next-line import/no-default-export
export default GetStarted;
