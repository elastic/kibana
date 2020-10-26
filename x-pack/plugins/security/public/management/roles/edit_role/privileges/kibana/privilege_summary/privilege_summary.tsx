/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButtonEmpty, EuiOverlayMask, EuiButton } from '@elastic/eui';
import { EuiFlyout } from '@elastic/eui';
import { EuiFlyoutHeader, EuiTitle, EuiFlyoutBody, EuiFlyoutFooter } from '@elastic/eui';
import { Space } from '../../../../../../../../spaces/common/model/space';
import { Role } from '../../../../../../../common/model';
import { PrivilegeSummaryTable } from './privilege_summary_table';
import { KibanaPrivileges } from '../../../../model';

interface Props {
  role: Role;
  spaces: Space[];
  kibanaPrivileges: KibanaPrivileges;
  canCustomizeSubFeaturePrivileges: boolean;
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
        <EuiOverlayMask headerZindexLocation="below">
          <EuiFlyout onClose={() => setIsOpen(false)} size={flyoutSize}>
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
        </EuiOverlayMask>
      )}
    </Fragment>
  );
};
