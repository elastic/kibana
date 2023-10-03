/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useMemo, useEffect, useState, useCallback, useRef } from 'react';
import type { MouseEventHandler } from 'react';

import styled from 'styled-components';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiLink,
  EuiButton,
  EuiSideNav,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  isIntegrationPolicyTemplate,
  isPackagePrerelease,
} from '../../../../../../../../common/services';

import {
  useGetPackageVerificationKeyId,
  useLink,
  useStartServices,
  sendGetFileByPath,
} from '../../../../../../../hooks';
import { isPackageUnverified } from '../../../../../../../services';
import type { PackageInfo, RegistryPolicyTemplate } from '../../../../../types';

import { Screenshots } from './screenshots';
import { Readme } from './readme';
import { Details } from './details';

interface Props {
  packageInfo: PackageInfo;
  integrationInfo?: RegistryPolicyTemplate;
  latestGAVersion?: string;
}

interface Item {
  id: string;
  name: string;
  items?: Item[];
  isSelected?: boolean;
  forceOpen: boolean;
  onClick: MouseEventHandler<HTMLElement | HTMLButtonElement>;
}
interface HeadingWithPosition {
  line: string;
  position: number;
}

const SideBar = styled(EuiFlexItem)`
  position: sticky;
  top: 70px;
  padding-top: 50px;
  padding-left: 10px;
  text-overflow: ellipsis;
  max-width: 180px;
  max-height: 500px;
`;
const StyledSideNav = styled(EuiSideNav)`
  overflow-y: auto;
  overflow-x: hidden;
`;

const UnverifiedCallout: React.FC = () => {
  const { docLinks } = useStartServices();

  return (
    <>
      <EuiCallOut
        title={i18n.translate('xpack.fleet.epm.verificationWarningCalloutTitle', {
          defaultMessage: 'Integration not verified',
        })}
        iconType="warning"
        color="warning"
      >
        <p>
          <FormattedMessage
            id="xpack.fleet.epm.verificationWarningCalloutIntroText"
            defaultMessage="This integration contains an unsigned package of unknown authenticity. Learn more about {learnMoreLink}."
            values={{
              learnMoreLink: (
                <EuiLink target="_blank" external href={docLinks.links.fleet.packageSignatures}>
                  <FormattedMessage
                    id="xpack.fleet.epm.verificationWarningCalloutLearnMoreLink"
                    defaultMessage="package signatures"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiCallOut>
      <EuiSpacer size="l" />
    </>
  );
};

const PrereleaseCallout: React.FC<{
  packageName: string;
  latestGAVersion?: string;
  packageTitle: string;
}> = ({ packageName, packageTitle, latestGAVersion }) => {
  const { getHref } = useLink();
  const overviewPathLatestGA = getHref('integration_details_overview', {
    pkgkey: `${packageName}-${latestGAVersion}`,
  });

  return (
    <>
      <EuiCallOut
        data-test-subj="prereleaseCallout"
        title={i18n.translate('xpack.fleet.epm.prereleaseWarningCalloutTitle', {
          defaultMessage: 'This is a pre-release version of {packageTitle} integration.',
          values: {
            packageTitle,
          },
        })}
        iconType="iInCircle"
        color="warning"
      >
        {latestGAVersion && (
          <p>
            <EuiButton href={overviewPathLatestGA} color="warning" data-test-subj="switchToGABtn">
              <FormattedMessage
                id="xpack.fleet.epm.prereleaseWarningCalloutSwitchToGAButton"
                defaultMessage="Switch to latest GA version"
              />
            </EuiButton>
          </p>
        )}
      </EuiCallOut>
      <EuiSpacer size="l" />
    </>
  );
};

// some names are too long so they're trimmed at 12 characters long
export const getAnchorId = (name: string | undefined, index?: number) => {
  if (!name) return '';
  const baseId = `${name.replaceAll(' ', '-').toLowerCase().slice(0, 12)}`;
  return index ? `${baseId}-${index}` : baseId;
};

export const OverviewPage: React.FC<Props> = memo(
  ({ packageInfo, integrationInfo, latestGAVersion }) => {
    const screenshots = useMemo(
      () => integrationInfo?.screenshots || packageInfo.screenshots || [],
      [integrationInfo, packageInfo.screenshots]
    );
    const { packageVerificationKeyId } = useGetPackageVerificationKeyId();
    const isUnverified = isPackageUnverified(packageInfo, packageVerificationKeyId);
    const isPrerelease = isPackagePrerelease(packageInfo.version);
    const [markdown, setMarkdown] = useState<string | undefined>(undefined);
    const [selectedItemId, setSelectedItem] = useState<string | undefined>(undefined);
    const [isSideNavOpenOnMobile, setIsSideNavOpenOnMobile] = useState(false);
    const anchorsRefs = useRef(new Map<string, HTMLDivElement | null>());

    const selectItem = (id: string) => {
      setSelectedItem(id);
      anchorsRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    const toggleOpenOnMobile = () => {
      setIsSideNavOpenOnMobile(!isSideNavOpenOnMobile);
    };

    const readmePath =
      integrationInfo && isIntegrationPolicyTemplate(integrationInfo) && integrationInfo?.readme
        ? integrationInfo?.readme
        : packageInfo.readme || '';

    useEffect(() => {
      sendGetFileByPath(readmePath).then((res) => {
        setMarkdown(res.data || '');
      });
    }, [readmePath]);

    const extractHeadingsWithIndices = (markDown: string | undefined): HeadingWithPosition[] => {
      if (!markDown) return [];
      const regex = /^\s*#+\s+(.+)/;
      return markDown
        .split('\n')
        .map((line, position) => {
          return {
            line,
            position,
          };
        })
        .filter((obj) => obj.line.match(regex));
    };

    const getName = (heading: string) => heading.replace(/^#+\s*/, '');

    const createItem = useCallback(
      (heading: HeadingWithPosition, options: any = {}): Item => {
        // NOTE: Duplicate `name` values will cause `id` collisions
        const name = getName(heading.line);
        const id = getAnchorId(name, heading.position + 1);
        return {
          id,
          name,
          isSelected: selectedItemId === id,
          onClick: () => selectItem(id),
          ...options,
        };
      },
      [selectedItemId]
    );

    // get the headings and creates a nested structure as requested by EuiSideNav
    const headingsToNavItems = useCallback(
      (headings: HeadingWithPosition[]): Item[] => {
        const options = { forceOpen: true };
        return headings.reduce((acc: Item[], heading: HeadingWithPosition, index: number) => {
          if (heading.line.startsWith('## ')) {
            const item = createItem(heading, options);
            acc.push(item);
          } else if (heading.line.startsWith('### ')) {
            const subGroup = createItem(heading, options);
            let i = index + 1;
            while (i < headings.length && headings[i].line.startsWith('#### ')) {
              const subGroupItem = createItem(headings[i], options);
              if (!subGroup?.items) subGroup.items = [];
              subGroup.items?.push(subGroupItem);
              i++;
            }
            const prevIndex = acc.length - 1;

            if (prevIndex >= 0) {
              if (!acc[prevIndex]?.items) acc[prevIndex].items = [];
              acc[prevIndex]?.items?.push(subGroup);
            } else {
              // this handles a case where the headings only have ### and no ##
              const fakeItem = createItem({ line: '', position: heading.position }, options);
              acc.push(fakeItem);
              if (!acc[0]?.items) acc[0].items = [];
              acc[0]?.items?.push(subGroup);
            }
          }
          return acc;
        }, []);
      },
      [createItem]
    );
    const headingsWithIndices = useMemo(() => extractHeadingsWithIndices(markdown), [markdown]);

    const navItems = useMemo(
      () => headingsToNavItems(headingsWithIndices),
      [headingsToNavItems, headingsWithIndices]
    );

    const h1: HeadingWithPosition | undefined = useMemo(
      () => headingsWithIndices.find((h) => h.line.startsWith('# ')),
      [headingsWithIndices]
    );

    const sideNavItems = useMemo(() => {
      const name = `${h1 ? getName(h1.line) : ''}`;
      const id = getAnchorId(name, h1 ? h1?.position + 1 : 1);
      return [
        {
          name,
          id,
          onClick: () => selectItem(id),
          items: navItems,
        },
      ];
    }, [h1, navItems]);

    return (
      <EuiFlexGroup alignItems="flexStart" data-test-subj="epm.OverviewPage">
        <SideBar grow={2}>
          {sideNavItems ? (
            <StyledSideNav
              mobileTitle="Nav Items"
              toggleOpenOnMobile={toggleOpenOnMobile}
              isOpenOnMobile={isSideNavOpenOnMobile}
              items={sideNavItems}
            />
          ) : null}
        </SideBar>
        <EuiFlexItem grow={9} className="eui-textBreakWord">
          {isUnverified && <UnverifiedCallout />}
          {isPrerelease && (
            <PrereleaseCallout
              packageName={packageInfo.name}
              packageTitle={packageInfo.title}
              latestGAVersion={latestGAVersion}
            />
          )}
          {packageInfo.readme ? (
            <Readme
              markdown={markdown}
              packageName={packageInfo.name}
              version={packageInfo.version}
              refs={anchorsRefs}
            />
          ) : null}
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
          <EuiFlexGroup direction="column" gutterSize="l" alignItems="flexStart">
            {screenshots.length ? (
              <EuiFlexItem>
                <Screenshots
                  images={screenshots}
                  packageName={packageInfo.name}
                  version={packageInfo.version}
                />
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem>
              <Details packageInfo={packageInfo} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
