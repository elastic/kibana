/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { FC } from 'react';
import React, { useState } from 'react';

import type { ScopedHistory } from '@kbn/core-application-browser';
import type { KibanaFeature } from '@kbn/features-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';

import { ViewSpaceTabFooter } from './footer';
import { useViewSpaceServices } from './hooks/view_space_context_provider';
import type { Space } from '../../../common';
import { FeatureTable } from '../edit_space/enabled_features/feature_table';
import { SectionPanel } from '../edit_space/section_panel';
import { SolutionView } from '../edit_space/solution_view';

interface Props {
  space: Space;
  features: KibanaFeature[];
  isSolutionNavEnabled: boolean;
  history: ScopedHistory;
}

export const ViewSpaceEnabledFeatures: FC<Props> = ({
  features,
  space,
  isSolutionNavEnabled,
  ...props
}) => {
  const [spaceNavigation, setSpaceNavigation] = useState<Partial<Space>>(space); // space details as seen in the Solution View UI, possibly with unsaved changes
  const [spaceFeatures, setSpaceFeatures] = useState<Partial<Space>>(space); // space details as seen in the Feature Visibility UI, possibly with unsaved changes
  const [isDirty, setIsDirty] = useState(false); // track if unsaved changes have been made
  const [isLoading, setIsLoading] = useState(false); // track if user has just clicked the Update button

  const { capabilities, getUrlForApp, http, overlays, navigateToUrl, spacesManager } =
    useViewSpaceServices();

  useUnsavedChangesPrompt({
    hasUnsavedChanges: isDirty,
    http,
    openConfirm: overlays.openConfirm,
    navigateToUrl,
    history: props.history,
  });

  if (!features) {
    return null;
  }

  const canManageRoles = capabilities.management?.security?.roles === true;

  const onChangeSpaceNavigation = (updatedSpace: Partial<Space>) => {
    setIsDirty(true);
    setSpaceNavigation(updatedSpace);
  };

  const onChangeSpaceFeatures = (updatedSpace: Partial<Space>) => {
    setIsDirty(true);
    setSpaceFeatures({ ...updatedSpace, id: space.id });
  };

  const onUpdateSpace = async () => {
    const { id, name, disabledFeatures } = spaceFeatures;
    if (!id) {
      throw new Error(`Can not update space without id field!`);
    }
    if (!name) {
      throw new Error(`Can not update space without name field!`);
    }

    // TODO cancel previous request, if there is one pending
    await spacesManager.updateSpace({
      id,
      name,
      disabledFeatures: disabledFeatures ?? [],
      ...spaceFeatures,
    });

    // TODO error handling
    setIsDirty(false);
  };

  const onCancel = () => {
    setSpaceNavigation(space);
    setSpaceFeatures(space);
    setIsDirty(false);
  };

  return (
    <>
      {isSolutionNavEnabled && (
        <>
          <SolutionView space={spaceNavigation} onChange={onChangeSpaceNavigation} />
          <EuiSpacer />
        </>
      )}

      <SectionPanel data-test-subj="enabled-features-panel">
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.spaces.management.viewSpaceFeatures.featuresVisibility"
                  defaultMessage="Set features visibility"
                />
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.spaces.management.viewSpaceFeatures.notASecurityMechanismMessage"
                  defaultMessage="Hidden features are removed from the user interface, but not disabled. To secure access to features, {manageRolesLink}."
                  values={{
                    manageRolesLink: canManageRoles ? (
                      <EuiLink href={getUrlForApp('management', { path: '/security/roles' })}>
                        <FormattedMessage
                          id="xpack.spaces.management.viewSpaceFeatures.manageRolesLinkText"
                          defaultMessage="manage security roles"
                        />
                      </EuiLink>
                    ) : (
                      <FormattedMessage
                        id="xpack.spaces.management.viewSpaceFeatures.manageRolesLinkText"
                        defaultMessage="manage security roles"
                      />
                    ),
                  }}
                />
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <FeatureTable
              features={features}
              space={spaceFeatures}
              onChange={onChangeSpaceFeatures}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </SectionPanel>

      <ViewSpaceTabFooter
        isDirty={isDirty}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        onCancel={onCancel}
        onUpdateSpace={onUpdateSpace}
      />
    </>
  );
};
