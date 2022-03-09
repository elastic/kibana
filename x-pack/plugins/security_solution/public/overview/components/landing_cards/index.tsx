/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import styled from 'styled-components';
import * as i18n from './translations';

const imgUrls = {
  siem: 'https://raw.githubusercontent.com/elastic/eui/v51.0.0/src-docs/src/images/page.svg',
  endpoint: 'https://raw.githubusercontent.com/elastic/eui/v51.0.0/src-docs/src/images/text.svg',
  cloud: 'https://raw.githubusercontent.com/elastic/eui/v51.0.0/src-docs/src/images/icons.svg',
  timeline: 'https://raw.githubusercontent.com/elastic/eui/v51.0.0/src-docs/src/images/tables.svg',
  analyzer: 'https://raw.githubusercontent.com/elastic/eui/v51.0.0/src-docs/src/images/forms.svg',
  sessionViewer:
    'https://raw.githubusercontent.com/elastic/eui/v51.0.0/src-docs/src/images/flexgrid.svg',
  correlation:
    'https://raw.githubusercontent.com/elastic/eui/v51.0.0/src-docs/src/images/charts.svg',
};
const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;
const StyledEuiFlexItem = styled(EuiFlexItem)`
  margin-top: 20px;
`;

export const LandingCards = memo(() => (
  <EuiFlexGroup direction="column" gutterSize="l">
    <EuiFlexItem>
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem>
          <EuiCard
            description={i18n.SIEM_DESCRIPTION}
            hasBorder
            image={imgUrls.siem}
            textAlign="center"
            title={i18n.SIEM_TITLE}
            footer={
              <EuiText size="s">
                <p>
                  <EuiLink href="#">{i18n.SIEM_CTA}</EuiLink>
                </p>
              </EuiText>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder>
            <StyledEuiFlexGroup gutterSize="none" direction="column" justifyContent="spaceBetween">
              <EuiFlexItem>
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiFlexGroup
                      gutterSize="none"
                      direction="column"
                      justifyContent="spaceBetween"
                    >
                      <EuiFlexItem>
                        <EuiImage alt={i18n.ENDPOINT_TITLE} src={imgUrls.endpoint} />
                      </EuiFlexItem>

                      <EuiFlexItem grow={false}>
                        <EuiText size="xs">
                          <h4>{i18n.ENDPOINT_TITLE}</h4>
                          <p>{i18n.ENDPOINT_DESCRIPTION}</p>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFlexGroup direction="column" justifyContent="spaceBetween">
                      <EuiFlexItem>
                        <EuiImage alt={i18n.CLOUD_TITLE} src={imgUrls.cloud} />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs">
                          <h4>{i18n.CLOUD_TITLE}</h4>
                          <p>{i18n.CLOUD_DESCRIPTION}</p>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <StyledEuiFlexItem grow={false}>
                <EuiFlexGroup justifyContent="spaceAround">
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <p>
                        <EuiLink href="#">{i18n.SIEM_CTA}</EuiLink>
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </StyledEuiFlexItem>
            </StyledEuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem>
          <EuiCard
            description={i18n.TIMELINE_DESCRIPTION}
            hasBorder
            image={imgUrls.timeline}
            textAlign="center"
            title={i18n.TIMELINE_TITLE}
            href={'#'}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            description={i18n.ANALYZER_DESCRIPTION}
            hasBorder
            image={imgUrls.analyzer}
            textAlign="center"
            title={i18n.ANALYZER_TITLE}
            href={'#'}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            description={i18n.SESSION_VIEWER_DESCRIPTION}
            hasBorder
            image={imgUrls.sessionViewer}
            textAlign="center"
            title={i18n.SESSION_VIEWER_TITLE}
            href={'#'}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            description={i18n.CORRELATION_DESCRIPTION}
            hasBorder
            image={imgUrls.correlation}
            textAlign="center"
            title={i18n.CORRELATION_TITLE}
            href={'#'}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  </EuiFlexGroup>
));
LandingCards.displayName = 'LandingCards';
