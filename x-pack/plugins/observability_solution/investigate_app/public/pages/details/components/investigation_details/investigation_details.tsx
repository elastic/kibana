/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AuthenticatedUser } from '@kbn/security-plugin/common';
import React, { useState } from 'react';
import { paths } from '../../../../../common/paths';
import { InvestigationEditForm } from '../../../../components/investigation_edit_form/investigation_edit_form';
import { useKibana } from '../../../../hooks/use_kibana';
import { useInvestigation } from '../../contexts/investigation_context';
import { InvestigationHeader } from '../investigation_header/investigation_header';
import { InvestigationItems } from '../investigation_items/investigation_items';
import { InvestigationNotes } from '../investigation_notes/investigation_notes';
import { useScreenContext } from '../../../../hooks/use_screen_context';

interface Props {
  user: AuthenticatedUser;
}

export function InvestigationDetails({ user }: Props) {
  const {
    core: {
      http: { basePath },
    },
    dependencies: {
      start: { observabilityShared },
    },
  } = useKibana();
  useScreenContext();

  const ObservabilityPageTemplate = observabilityShared.navigation.PageTemplate;
  const { investigation } = useInvestigation();
  const [isEditFormFlyoutVisible, setEditFormFlyoutVisible] = useState<boolean>(false);

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        breadcrumbs: [
          {
            href: basePath.prepend(paths.investigations),
            text: i18n.translate('xpack.investigateApp.detailsPage.breadcrumb.list', {
              defaultMessage: 'Investigations',
            }),
          },
          {
            text: i18n.translate('xpack.investigateApp.detailsPage.breadcrumb.details', {
              defaultMessage: 'Investigation details',
            }),
          },
        ],
        pageTitle: <InvestigationHeader />,
        rightSideItems: [
          <EuiButton fill data-test-subj="escalateButton">
            {i18n.translate('xpack.investigateApp.investigationDetails.escalateButtonLabel', {
              defaultMessage: 'Escalate',
            })}
          </EuiButton>,
          <EuiButton
            data-test-subj="editButton"
            fill
            onClick={() => setEditFormFlyoutVisible(true)}
          >
            {i18n.translate('xpack.investigateApp.investigationDetails.editButtonLabel', {
              defaultMessage: 'Edit',
            })}
          </EuiButton>,
        ],
      }}
    >
      <EuiFlexGroup direction="row" responsive>
        <EuiFlexItem grow={8}>
          <InvestigationItems />
        </EuiFlexItem>

        <EuiFlexItem grow={2}>
          <InvestigationNotes user={user} />
        </EuiFlexItem>
      </EuiFlexGroup>
      {isEditFormFlyoutVisible && investigation && (
        <InvestigationEditForm
          investigationId={investigation.id}
          onClose={() => setEditFormFlyoutVisible(false)}
        />
      )}
    </ObservabilityPageTemplate>
  );
}
