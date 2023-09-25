/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MouseEventHandler } from 'react';
import React, { memo, useMemo, useEffect, useState, useCallback } from 'react';
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
  onClick: MouseEventHandler<HTMLElement | HTMLButtonElement>;
  forceOpen: boolean;
}

const LeftColumn = styled(EuiFlexItem)`
  position: sticky;
  top: 70px;
  padding-top: 50px;
  padding-left: 10px;
  text-overflow: ellipsis;
  max-width: 180px;
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

export const getAnchorId = (name: string, index: number) =>
  `${name.replaceAll(' ', '').toLowerCase().slice(0, 8)}-${index}`;

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
    const [selectedItemName, setSelectedItem] = useState<string>(undefined);

    const [isSideNavOpenOnMobile, setIsSideNavOpenOnMobile] = useState(false);

    const selectItem = (name: string) => {
      setSelectedItem(name);
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

    const extractHeadings = (markDown: string | undefined) => {
      if (!markDown) return [];
      const regex = /^\s*#+\s+(.+)/;
      return markDown.split('\n').filter((line) => line.match(regex));
    };

    const getName = (heading: string) => heading.replace(/^#+\s*/, '');

    const createItem = useCallback(
      (name: string, index: number, options: any = {}): Item => {
        // NOTE: Duplicate `name` values will cause `id` collisions
        // some names are too long so they're trimmed at 8 characters long
        const id = getAnchorId(name, index);
        return {
          id,
          name,
          isSelected: selectedItemName === id,
          onClick: () => selectItem(id),
          ...options,
        };
      },
      [selectedItemName]
    );
    console.log(selectedItemName);
    // get the headings and creates a nested structure as requested by EuiSideNav
    const headingsToNavItems = useCallback(
      (headings: string[]): Item[] => {
        const options = { forceOpen: true };
        return headings.reduce((acc: Item[], heading: string, index: number) => {
          if (heading.startsWith('## ')) {
            const item = createItem(getName(heading), index, options);
            acc.push(item);
          } else if (heading.startsWith('### ')) {
            const subGroup = createItem(getName(heading), index, options);
            let i = index + 1;
            while (i < headings.length && headings[i].startsWith('#### ')) {
              const subGroupItem = createItem(getName(headings[i]), i, options);
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
              const fakeItem = createItem(getName(''), i, options);
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

    const sideNavItems = useMemo(() => {
      const headings = extractHeadings(markdown);
      // console.log('headings', headings);
      const navItems = headingsToNavItems(headings);
      // console.log('navItems', navItems);
      const h1 = headings.find((h) => h.startsWith('# '));
      const title = h1 ? getName(h1) : '';
      return [
        {
          name: `${title}`,
          id: getAnchorId(title, 0),
          items: navItems,
        },
      ];
    }, [headingsToNavItems, markdown]);

    return (
      <EuiFlexGroup alignItems="flexStart" data-test-subj="epm.OverviewPage">
        <LeftColumn grow={2}>
          <EuiSideNav
            mobileTitle="Nav Items"
            toggleOpenOnMobile={toggleOpenOnMobile}
            isOpenOnMobile={isSideNavOpenOnMobile}
            items={sideNavItems}
          />
        </LeftColumn>
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
              // selectedItemName
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
