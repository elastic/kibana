/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonProps,
  EuiLink,
  EuiLinkProps,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  PropsForAnchor,
  PropsForButton,
} from '@elastic/eui';
import React, { useMemo, useCallback } from 'react';
import { isNil } from 'lodash/fp';
import styled from 'styled-components';

import { IP_REPUTATION_LINKS_SETTING, APP_ID } from '../../../../common/constants';
import {
  DefaultFieldRendererOverflow,
  DEFAULT_MORE_MAX_HEIGHT,
} from '../../../timelines/components/field_renderers/field_renderers';
import { encodeIpv6 } from '../../lib/helpers';
import {
  getCaseDetailsUrl,
  getHostDetailsUrl,
  getIPDetailsUrl,
  getCreateCaseUrl,
  useFormatUrl,
} from '../link_to';
import { FlowTarget, FlowTargetSourceDest } from '../../../graphql/types';
import { useUiSetting$, useKibana } from '../../lib/kibana';
import { isUrlInvalid } from '../../utils/validators';
import { ExternalLinkIcon } from '../external_link_icon';

import * as i18n from './translations';
import { SecurityPageName } from '../../../app/types';

export const DEFAULT_NUMBER_OF_LINK = 5;

export const LinkButton: React.FC<
  PropsForButton<EuiButtonProps> | PropsForAnchor<EuiButtonProps>
> = ({ children, ...props }) => <EuiButton {...props}>{children}</EuiButton>;

export const LinkAnchor: React.FC<EuiLinkProps> = ({ children, ...props }) => (
  <EuiLink {...props}>{children}</EuiLink>
);

// Internal Links
const HostDetailsLinkComponent: React.FC<{ children?: React.ReactNode; hostName: string }> = ({
  children,
  hostName,
}) => {
  const { formatUrl, search } = useFormatUrl(SecurityPageName.hosts);
  const { navigateToApp } = useKibana().services.application;
  const goToHostDetails = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(`${APP_ID}:${SecurityPageName.hosts}`, {
        path: getHostDetailsUrl(encodeURIComponent(hostName), search),
      });
    },
    [hostName, navigateToApp, search]
  );

  return (
    <LinkAnchor
      onClick={goToHostDetails}
      href={formatUrl(getHostDetailsUrl(encodeURIComponent(hostName)))}
    >
      {children ? children : hostName}
    </LinkAnchor>
  );
};
export const HostDetailsLink = React.memo(HostDetailsLinkComponent);

const allowedUrlSchemes = ['http://', 'https://'];
export const ExternalLink = React.memo<{
  url: string;
  children?: React.ReactNode;
  idx?: number;
  overflowIndexStart?: number;
  allItemsLimit?: number;
}>(
  ({
    url,
    children,
    idx,
    overflowIndexStart = DEFAULT_NUMBER_OF_LINK,
    allItemsLimit = DEFAULT_NUMBER_OF_LINK,
  }) => {
    const lastVisibleItemIndex = overflowIndexStart - 1;
    const lastItemIndex = allItemsLimit - 1;
    const lastIndexToShow = Math.max(0, Math.min(lastVisibleItemIndex, lastItemIndex));
    const inAllowlist = allowedUrlSchemes.some((scheme) => url.indexOf(scheme) === 0);
    return url && inAllowlist && !isUrlInvalid(url) && children ? (
      <EuiToolTip content={url} position="top" data-test-subj="externalLinkTooltip">
        <EuiLink href={url} target="_blank" rel="noopener" data-test-subj="externalLink">
          {children}
          <ExternalLinkIcon data-test-subj="externalLinkIcon" />
          {!isNil(idx) && idx < lastIndexToShow && <Comma data-test-subj="externalLinkComma" />}
        </EuiLink>
      </EuiToolTip>
    ) : null;
  }
);

ExternalLink.displayName = 'ExternalLink';

const IPDetailsLinkComponent: React.FC<{
  children?: React.ReactNode;
  ip: string;
  flowTarget?: FlowTarget | FlowTargetSourceDest;
}> = ({ children, ip, flowTarget = FlowTarget.source }) => {
  const { formatUrl, search } = useFormatUrl(SecurityPageName.network);
  const { navigateToApp } = useKibana().services.application;
  const goToNetworkDetails = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(`${APP_ID}:${SecurityPageName.network}`, {
        path: getIPDetailsUrl(encodeURIComponent(encodeIpv6(ip)), flowTarget, search),
      });
    },
    [flowTarget, ip, navigateToApp, search]
  );

  return (
    <LinkAnchor
      onClick={goToNetworkDetails}
      href={formatUrl(getIPDetailsUrl(encodeURIComponent(encodeIpv6(ip))))}
    >
      {children ? children : ip}
    </LinkAnchor>
  );
};

export const IPDetailsLink = React.memo(IPDetailsLinkComponent);

const CaseDetailsLinkComponent: React.FC<{
  children?: React.ReactNode;
  detailName: string;
  title?: string;
}> = ({ children, detailName, title }) => {
  const { formatUrl, search } = useFormatUrl(SecurityPageName.case);
  const { navigateToApp } = useKibana().services.application;
  const goToCaseDetails = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(`${APP_ID}:${SecurityPageName.case}`, {
        path: getCaseDetailsUrl({ id: detailName, search }),
      });
    },
    [detailName, navigateToApp, search]
  );

  return (
    <LinkAnchor
      onClick={goToCaseDetails}
      href={formatUrl(getCaseDetailsUrl({ id: detailName }))}
      data-test-subj="case-details-link"
      aria-label={i18n.CASE_DETAILS_LINK_ARIA(title ?? detailName)}
    >
      {children ? children : detailName}
    </LinkAnchor>
  );
};
export const CaseDetailsLink = React.memo(CaseDetailsLinkComponent);
CaseDetailsLink.displayName = 'CaseDetailsLink';

export const CreateCaseLink = React.memo<{ children: React.ReactNode }>(({ children }) => {
  const { formatUrl, search } = useFormatUrl(SecurityPageName.case);
  const { navigateToApp } = useKibana().services.application;
  const goToCreateCase = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(`${APP_ID}:${SecurityPageName.case}`, {
        path: getCreateCaseUrl(search),
      });
    },
    [navigateToApp, search]
  );
  return (
    <LinkAnchor onClick={goToCreateCase} href={formatUrl(getCreateCaseUrl())}>
      {children}
    </LinkAnchor>
  );
});

CreateCaseLink.displayName = 'CreateCaseLink';

// External Links
export const GoogleLink = React.memo<{ children?: React.ReactNode; link: string }>(
  ({ children, link }) => (
    <ExternalLink url={`https://www.google.com/search?q=${encodeURIComponent(link)}`}>
      {children ? children : link}
    </ExternalLink>
  )
);

GoogleLink.displayName = 'GoogleLink';

export const PortOrServiceNameLink = React.memo<{
  children?: React.ReactNode;
  portOrServiceName: number | string;
}>(({ children, portOrServiceName }) => (
  <EuiLink
    data-test-subj="port-or-service-name-link"
    href={`https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=${encodeURIComponent(
      String(portOrServiceName)
    )}`}
    target="_blank"
  >
    {children ? children : portOrServiceName}
  </EuiLink>
));

PortOrServiceNameLink.displayName = 'PortOrServiceNameLink';

export const Ja3FingerprintLink = React.memo<{
  children?: React.ReactNode;
  ja3Fingerprint: string;
}>(({ children, ja3Fingerprint }) => (
  <EuiLink
    data-test-subj="ja3-fingerprint-link"
    href={`https://sslbl.abuse.ch/ja3-fingerprints/${encodeURIComponent(ja3Fingerprint)}`}
    target="_blank"
  >
    {children ? children : ja3Fingerprint}
  </EuiLink>
));

Ja3FingerprintLink.displayName = 'Ja3FingerprintLink';

export const CertificateFingerprintLink = React.memo<{
  children?: React.ReactNode;
  certificateFingerprint: string;
}>(({ children, certificateFingerprint }) => (
  <EuiLink
    data-test-subj="certificate-fingerprint-link"
    href={`https://sslbl.abuse.ch/ssl-certificates/sha1/${encodeURIComponent(
      certificateFingerprint
    )}`}
    target="_blank"
  >
    {children ? children : certificateFingerprint}
  </EuiLink>
));

CertificateFingerprintLink.displayName = 'CertificateFingerprintLink';

enum DefaultReputationLink {
  'virustotal.com' = 'virustotal.com',
  'talosIntelligence.com' = 'talosIntelligence.com',
}

export interface ReputationLinkSetting {
  name: string;
  url_template: string;
}

function isDefaultReputationLink(name: string): name is DefaultReputationLink {
  return (
    name === DefaultReputationLink['virustotal.com'] ||
    name === DefaultReputationLink['talosIntelligence.com']
  );
}
const isReputationLink = (
  rowItem: string | ReputationLinkSetting
): rowItem is ReputationLinkSetting =>
  (rowItem as ReputationLinkSetting).url_template !== undefined &&
  (rowItem as ReputationLinkSetting).name !== undefined;

export const Comma = styled('span')`
  margin-right: 5px;
  margin-left: 5px;
  &::after {
    content: ' ,';
  }
`;

Comma.displayName = 'Comma';

const defaultNameMapping: Record<DefaultReputationLink, string> = {
  [DefaultReputationLink['virustotal.com']]: i18n.VIEW_VIRUS_TOTAL,
  [DefaultReputationLink['talosIntelligence.com']]: i18n.VIEW_TALOS_INTELLIGENCE,
};

const ReputationLinkComponent: React.FC<{
  overflowIndexStart?: number;
  allItemsLimit?: number;
  showDomain?: boolean;
  domain: string;
  direction?: 'row' | 'column';
}> = ({
  overflowIndexStart = DEFAULT_NUMBER_OF_LINK,
  allItemsLimit = DEFAULT_NUMBER_OF_LINK,
  showDomain = false,
  domain,
  direction = 'row',
}) => {
  const [ipReputationLinksSetting] = useUiSetting$<ReputationLinkSetting[]>(
    IP_REPUTATION_LINKS_SETTING
  );

  const ipReputationLinks: ReputationLinkSetting[] = useMemo(
    () =>
      ipReputationLinksSetting
        ?.slice(0, allItemsLimit)
        .filter(
          ({ url_template, name }) =>
            !isNil(url_template) && !isNil(name) && !isUrlInvalid(url_template)
        )
        .map(({ name, url_template }: { name: string; url_template: string }) => ({
          name: isDefaultReputationLink(name) ? defaultNameMapping[name] : name,
          url_template: url_template.replace(`{{ip}}`, encodeURIComponent(domain)),
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ipReputationLinksSetting, domain, defaultNameMapping, allItemsLimit]
  );

  return ipReputationLinks?.length > 0 ? (
    <section>
      <EuiFlexGroup
        gutterSize="none"
        justifyContent="center"
        direction={direction}
        alignItems="center"
        data-test-subj="reputationLinkGroup"
      >
        <EuiFlexItem grow={true}>
          {ipReputationLinks
            ?.slice(0, overflowIndexStart)
            .map(({ name, url_template: urlTemplate }: ReputationLinkSetting, id) => (
              <ExternalLink
                allItemsLimit={ipReputationLinks.length}
                idx={id}
                overflowIndexStart={overflowIndexStart}
                url={urlTemplate}
                data-test-subj="externalLinkComponent"
                key={`reputationLink-${id}`}
              >
                <>{showDomain ? domain : name ?? domain}</>
              </ExternalLink>
            ))}
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <DefaultFieldRendererOverflow
            rowItems={ipReputationLinks}
            idPrefix="moreReputationLink"
            render={(rowItem) => {
              return (
                isReputationLink(rowItem) && (
                  <ExternalLink
                    url={rowItem.url_template}
                    overflowIndexStart={overflowIndexStart}
                    allItemsLimit={allItemsLimit}
                  >
                    <>{rowItem.name ?? domain}</>
                  </ExternalLink>
                )
              );
            }}
            moreMaxHeight={DEFAULT_MORE_MAX_HEIGHT}
            overflowIndexStart={overflowIndexStart}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </section>
  ) : null;
};

ReputationLinkComponent.displayName = 'ReputationLinkComponent';

export const ReputationLink = React.memo(ReputationLinkComponent);

export const WhoIsLink = React.memo<{ children?: React.ReactNode; domain: string }>(
  ({ children, domain }) => (
    <ExternalLink url={`https://www.iana.org/whois?q=${encodeURIComponent(domain)}`}>
      {children ? children : domain}
    </ExternalLink>
  )
);

WhoIsLink.displayName = 'WhoIsLink';
