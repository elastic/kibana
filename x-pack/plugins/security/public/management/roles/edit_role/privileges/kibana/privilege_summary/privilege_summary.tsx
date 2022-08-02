/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import React, { Fragment, useState } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import type { Space, SpacesApiUi } from '@kbn/spaces-plugin/public';

import type { Role } from '../../../../../../../common/model';
import type { KibanaPrivileges } from '../../../../model';
import { PrivilegeSummaryTable } from './privilege_summary_table';

interface Props {
  role: Role;
  spaces: Space[];
  kibanaPrivileges: KibanaPrivileges;
  canCustomizeSubFeaturePrivileges: boolean;
  spacesApiUi: SpacesApiUi;
}
export const PrivilegeSummary = (props: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  const numberOfPrivilegeDefinitions = props.role.kibana.length;
  const flyoutSize = numberOfPrivilegeDefinitions > 5 ? 'l' : 'm';

  return (
    <Fragment>
      <EuiButtonEmpty onClick={() => setIsOpen(true)} data-test-subj="viewPrivilegeSummaryButton">
        <FormattedMessage
          id="xpack.security.management.editRole.privilegeSummary.viewSummaryButtonText"
          defaultMessage="View privilege summary"
        />
      </EuiButtonEmpty>
      {isOpen && (
        <EuiFlyout
          onClose={() => setIsOpen(false)}
          size={flyoutSize}
          maskProps={{ headerZindexLocation: 'below' }}
        >
          <EuiFlyoutHeader>
            <EuiTitle size="m">
              <h2>
                <FormattedMessage
                  id="xpack.security.management.editRole.privilegeSummary.modalHeaderTitle"
                  defaultMessage="Privilege summary"
                />
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <PrivilegeSummaryTable
              role={props.role}
              spaces={props.spaces}
              kibanaPrivileges={props.kibanaPrivileges}
              canCustomizeSubFeaturePrivileges={props.canCustomizeSubFeaturePrivileges}
              spacesApiUi={props.spacesApiUi}
            />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiButton onClick={() => setIsOpen(false)}>
              <FormattedMessage
                id="xpack.security.management.editRole.privilegeSummary.closeSummaryButtonText"
                defaultMessage="Close"
              />
            </EuiButton>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </Fragment>
  );
};
