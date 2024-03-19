/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiCodeBlock,
  EuiSpacer,
  EuiSkeletonText,
  EuiCallOut,
  EuiLink,
  EuiCode,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { PackageInfo } from '../../../../../types';

import { useGetInputsTemplatesQuery, useStartServices } from '../../../../../hooks';
import { PrereleaseCallout } from '../overview/overview';

import { isPackagePrerelease } from '../../../../../../../../common/services';

interface ConfigsProps {
  packageInfo: PackageInfo;
}

export const Configs: React.FC<ConfigsProps> = ({ packageInfo }) => {
  const { notifications, docLinks } = useStartServices();
  const { name: pkgName, version: pkgVersion, title: pkgTitle } = packageInfo;
  const notInstalled = packageInfo.status !== 'installing';

  const isPrerelease = isPackagePrerelease(packageInfo.version);
  const {
    data: configs,
    error,
    isLoading,
  } = useGetInputsTemplatesQuery(
    { pkgName, pkgVersion },
    { format: 'yaml', prerelease: isPrerelease }
  );

  if (error) {
    notifications.toasts.addError(error, {
      title: i18n.translate('xpack.fleet.epm.InputTemplates.loadingErro', {
        defaultMessage: 'Error input templates',
      }),
    });
  }

  return (
    <EuiFlexGroup data-test-subj="epm.Configs" alignItems="flexStart">
      <EuiFlexItem grow={1} />
      <EuiFlexItem grow={6}>
        {isLoading && !configs ? (
          <EuiSkeletonText lines={10} />
        ) : (
          <>
            {isPrerelease && (
              <>
                <EuiSpacer size="s" />
                <PrereleaseCallout
                  packageName={packageInfo.name}
                  packageTitle={packageInfo.title}
                />
              </>
            )}
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.fleet.epm.InputTemplates.mainText"
                  defaultMessage="View sample configurations for each of the {name} integration's data streams below. Copy/paste this YML into your {elasticAgentYml} file or into a file within your {inputsDir} directory. For more information, see the {userGuideLink}"
                  values={{
                    name: pkgTitle,
                    elasticAgentYml: <EuiCode>elastic-agent.yml</EuiCode>,
                    inputsDir: <EuiCode>inputs.d</EuiCode>,
                    userGuideLink: (
                      <EuiLink
                        href={docLinks.links.fleet.elasticAgentInputConfiguration}
                        external
                        target="_blank"
                      >
                        <FormattedMessage
                          id="xpack.fleet.epm.InputTemplates.guideLink"
                          defaultMessage="Fleet and Elastic Agent Guide"
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </EuiText>
            {notInstalled && (
              <>
                <EuiSpacer size="s" />
                <EuiCallOut
                  title={
                    <FormattedMessage
                      id="xpack.fleet.epm.InputTemplates.installCallout"
                      defaultMessage="Install the integration to use the following configs."
                    />
                  }
                  color="warning"
                  iconType="warning"
                />
              </>
            )}
            <EuiSpacer size="s" />
            <EuiCodeBlock language="yaml" isCopyable={true} paddingSize="s" overflowHeight={1000}>
              {configs}
            </EuiCodeBlock>
          </>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
