/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiToolTip,
} from '@elastic/eui';
import React, { useMemo, useCallback, SyntheticEvent } from 'react';
import { isArray, isNil } from 'lodash/fp';

import { IP_REPUTATION_LINKS_SETTING, APP_UI_ID } from '../../../../common/constants';
import {
  DefaultFieldRendererOverflow,
  DEFAULT_MORE_MAX_HEIGHT,
} from '../../../timelines/components/field_renderers/field_renderers';
import { encodeIpv6 } from '../../lib/helpers';
import {
  getCaseDetailsUrl,
  getHostDetailsUrl,
  getTabsOnHostDetailsUrl,
  getNetworkDetailsUrl,
  getCreateCaseUrl,
  useFormatUrl,
} from '../link_to';
import {
  FlowTarget,
  FlowTargetSourceDest,
} from '../../../../common/search_strategy/security_solution/network';
import { useUiSetting$, useKibana } from '../../lib/kibana';
import { isUrlInvalid } from '../../utils/validators';

import * as i18n from './translations';
import { SecurityPageName } from '../../../app/types';
import { getUsersDetailsUrl } from '../link_to/redirect_to_users';
import { LinkAnchor, GenericLinkButton, PortContainer, Comma } from './helpers';
import { HostsTableType } from '../../../hosts/store/model';

export { LinkButton, LinkAnchor } from './helpers';

export const DEFAULT_NUMBER_OF_LINK = 5;

// Internal Links
const UserDetailsLinkComponent: React.FC<{
  children?: React.ReactNode;
  /** `Component` is only used with `EuiDataGrid`; the grid keeps a reference to `Component` for show / hide functionality */
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  userName: string;
  title?: string;
  isButton?: boolean;
  onClick?: (e: SyntheticEvent) => void;
}> = ({ children, Component, userName, isButton, onClick, title }) => {
  const encodedUserName = encodeURIComponent(userName);

  const { formatUrl, search } = useFormatUrl(SecurityPageName.users);
  const { navigateToApp } = useKibana().services.application;
  const goToUsersDetails = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.users,
        path: getUsersDetailsUrl(encodedUserName, search),
      });
    },
    [encodedUserName, navigateToApp, search]
  );

  return isButton ? (
    <GenericLinkButton
      Component={Component}
      dataTestSubj="data-grid-user-details"
      href={formatUrl(getUsersDetailsUrl(encodedUserName))}
      onClick={onClick ?? goToUsersDetails}
      title={title ?? encodedUserName}
    >
      {children ? children : userName}
    </GenericLinkButton>
  ) : (
    <LinkAnchor
      data-test-subj="users-link-anchor"
      onClick={onClick ?? goToUsersDetails}
      href={formatUrl(getUsersDetailsUrl(encodedUserName))}
    >
      {children ? children : userName}
    </LinkAnchor>
  );
};

export const UserDetailsLink = React.memo(UserDetailsLinkComponent);

const HostDetailsLinkComponent: React.FC<{
  children?: React.ReactNode;
  /** `Component` is only used with `EuiDataGrid`; the grid keeps a reference to `Component` for show / hide functionality */
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  hostName: string;
  isButton?: boolean;
  onClick?: (e: SyntheticEvent) => void;
  hostTab?: HostsTableType;
  title?: string;
}> = ({ children, Component, hostName, isButton, onClick, title, hostTab }) => {
  const { formatUrl, search } = useFormatUrl(SecurityPageName.hosts);
  const { navigateToApp } = useKibana().services.application;

  const encodedHostName = encodeURIComponent(hostName);

  const goToHostDetails = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.hosts,
        path: hostTab
          ? getTabsOnHostDetailsUrl(encodedHostName, hostTab, search)
          : getHostDetailsUrl(encodedHostName, search),
      });
    },
    [encodedHostName, navigateToApp, search, hostTab]
  );
  const href = useMemo(
    () =>
      formatUrl(
        hostTab
          ? getTabsOnHostDetailsUrl(encodedHostName, hostTab)
          : getHostDetailsUrl(encodedHostName)
      ),
    [formatUrl, encodedHostName, hostTab]
  );
  return isButton ? (
    <GenericLinkButton
      Component={Component}
      dataTestSubj="data-grid-host-details"
      href={href}
      iconType="expand"
      onClick={onClick ?? goToHostDetails}
      title={title ?? hostName}
    >
      {children}
    </GenericLinkButton>
  ) : (
    <LinkAnchor
      onClick={onClick ?? goToHostDetails}
      href={href}
      data-test-subj="host-details-button"
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
        <>
          <EuiLink href={url} target="_blank" rel="noopener" data-test-subj="externalLink">
            {children}
          </EuiLink>
          {!isNil(idx) && idx < lastIndexToShow && <Comma data-test-subj="externalLinkComma" />}
        </>
      </EuiToolTip>
    ) : null;
  }
);

ExternalLink.displayName = 'ExternalLink';

const NetworkDetailsLinkComponent: React.FC<{
  children?: React.ReactNode;
  /** `Component` is only used with `EuiDataGrid`; the grid keeps a reference to `Component` for show / hide functionality */
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  ip: string | string[];
  flowTarget?: FlowTarget | FlowTargetSourceDest;
  isButton?: boolean;
  onClick?: (e: SyntheticEvent) => void | undefined;
  title?: string;
}> = ({ Component, children, ip, flowTarget = FlowTarget.source, isButton, onClick, title }) => {
  const { formatUrl, search } = useFormatUrl(SecurityPageName.network);
  const { navigateToApp } = useKibana().services.application;
  const goToNetworkDetails = useCallback(
    (ev, cIp: string) => {
      ev.preventDefault();
      navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.network,
        path: getNetworkDetailsUrl(encodeURIComponent(encodeIpv6(cIp)), flowTarget, search),
      });
    },
    [flowTarget, navigateToApp, search]
  );
  const getHref = useCallback(
    (cIp: string) => formatUrl(getNetworkDetailsUrl(encodeURIComponent(encodeIpv6(cIp)))),
    [formatUrl]
  );

  const getLink = useCallback(
    (cIp: string, i: number) =>
      isButton ? (
        <GenericLinkButton
          Component={Component}
          key={`${cIp}-${i}`}
          dataTestSubj="data-grid-network-details"
          onClick={onClick ?? ((e: SyntheticEvent) => goToNetworkDetails(e, cIp))}
          href={getHref(cIp)}
          title={title ?? cIp}
        >
          {children}
        </GenericLinkButton>
      ) : (
        <LinkAnchor
          key={`${cIp}-${i}`}
          onClick={onClick ?? ((e: SyntheticEvent) => goToNetworkDetails(e, cIp))}
          href={getHref(cIp)}
          data-test-subj="network-details"
        >
          {children ? children : cIp}
        </LinkAnchor>
      ),
    [Component, children, getHref, goToNetworkDetails, isButton, onClick, title]
  );
  return isArray(ip) ? <>{ip.map(getLink)}</> : getLink(ip, 0);
};

export const NetworkDetailsLink = React.memo(NetworkDetailsLinkComponent);

const CaseDetailsLinkComponent: React.FC<{
  children?: React.ReactNode;
  detailName: string;
  title?: string;
}> = ({ children, detailName, title }) => {
  const { formatUrl, search } = useFormatUrl(SecurityPageName.case);
  const { navigateToApp } = useKibana().services.application;
  const goToCaseDetails = useCallback(
    async (ev) => {
      ev.preventDefault();
      return navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.case,
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
    async (ev) => {
      ev.preventDefault();
      return navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.case,
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
  ({ children, link }) => {
    const url = useMemo(
      () => `https://www.google.com/search?q=${encodeURIComponent(link)}`,
      [link]
    );
    return <ExternalLink url={url}>{children ? children : link}</ExternalLink>;
  }
);

GoogleLink.displayName = 'GoogleLink';

export const PortOrServiceNameLink = React.memo<{
  children?: React.ReactNode;
  /** `Component` is only used with `EuiDataGrid`; the grid keeps a reference to `Component` for show / hide functionality */
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  portOrServiceName: number | string;
  onClick?: (e: SyntheticEvent) => void | undefined;
  title?: string;
}>(({ Component, title, children, portOrServiceName }) => {
  const href = useMemo(
    () =>
      `https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=${encodeURIComponent(
        String(portOrServiceName)
      )}`,
    [portOrServiceName]
  );
  return Component ? (
    <Component
      href={href}
      data-test-subj="data-grid-port-or-service-name-link"
      title={title}
      iconType="link"
    >
      {title ?? children ?? portOrServiceName}
    </Component>
  ) : (
    <PortContainer>
      <EuiLink data-test-subj="port-or-service-name-link" href={href} target="_blank">
        {children ? children : portOrServiceName}
      </EuiLink>
    </PortContainer>
  );
});

PortOrServiceNameLink.displayName = 'PortOrServiceNameLink';

export const Ja3FingerprintLink = React.memo<{
  children?: React.ReactNode;
  ja3Fingerprint: string;
}>(({ children, ja3Fingerprint }) => {
  const href = useMemo(
    () => `https://sslbl.abuse.ch/ja3-fingerprints/${encodeURIComponent(ja3Fingerprint)}`,
    [ja3Fingerprint]
  );
  return (
    <EuiLink data-test-subj="ja3-fingerprint-link" href={href} target="_blank">
      {children ? children : ja3Fingerprint}
    </EuiLink>
  );
});

Ja3FingerprintLink.displayName = 'Ja3FingerprintLink';

export const CertificateFingerprintLink = React.memo<{
  children?: React.ReactNode;
  certificateFingerprint: string;
}>(({ children, certificateFingerprint }) => {
  const href = useMemo(
    () =>
      `https://sslbl.abuse.ch/ssl-certificates/sha1/${encodeURIComponent(certificateFingerprint)}`,
    [certificateFingerprint]
  );
  return (
    <EuiLink data-test-subj="certificate-fingerprint-link" href={href} target="_blank">
      {children ? children : certificateFingerprint}
    </EuiLink>
  );
});

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
          // eslint-disable-next-line @typescript-eslint/naming-convention
          ({ url_template, name }) =>
            !isNil(url_template) && !isNil(name) && !isUrlInvalid(url_template)
        )
        // eslint-disable-next-line @typescript-eslint/naming-convention
        .map(({ name, url_template }: { name: string; url_template: string }) => ({
          name: isDefaultReputationLink(name) ? defaultNameMapping[name] : name,
          url_template: url_template.replace(`{{ip}}`, encodeURIComponent(domain)),
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ipReputationLinksSetting, domain, defaultNameMapping, allItemsLimit]
  );

  const renderCallback = useCallback(
    (rowItem) =>
      isReputationLink(rowItem) && (
        <ExternalLink
          url={rowItem.url_template}
          overflowIndexStart={overflowIndexStart}
          allItemsLimit={allItemsLimit}
        >
          <>{rowItem.name ?? domain}</>
        </ExternalLink>
      ),
    [allItemsLimit, domain, overflowIndexStart]
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
            render={renderCallback}
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
  ({ children, domain }) => {
    const url = useMemo(
      () => `https://www.iana.org/whois?q=${encodeURIComponent(domain)}`,
      [domain]
    );
    return <ExternalLink url={url}>{children ? children : domain}</ExternalLink>;
  }
);

WhoIsLink.displayName = 'WhoIsLink';
