/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ActionMenu,
  ActionMenuDivider,
  Section,
  SectionLink,
  SectionLinks,
  SectionSubtitle,
  SectionTitle,
} from '../../../../../observability/public';
import { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useLicenseContext } from '../../../context/license/use_license_context';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { CustomLinkMenuSection } from './CustomLinkMenuSection';
import { getSections } from './sections';

interface Props {
  readonly transaction: Transaction;
}

function ActionMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <EuiButtonEmpty iconType="arrowDown" iconSide="right" onClick={onClick}>
      {i18n.translate('xpack.apm.transactionActionMenu.actionsButtonLabel', {
        defaultMessage: 'Actions',
      })}
    </EuiButtonEmpty>
  );
}

export function TransactionActionMenu({ transaction }: Props) {
  const license = useLicenseContext();
  const hasGoldLicense = license?.isActive && license?.hasAtLeast('gold');

  const { core } = useApmPluginContext();
  const location = useLocation();
  const { urlParams } = useUrlParams();

  const [isActionPopoverOpen, setIsActionPopoverOpen] = useState(false);

  const sections = getSections({
    transaction,
    basePath: core.http.basePath,
    location,
    urlParams,
  });

  return (
    <>
      <ActionMenu
        id="transactionActionMenu"
        closePopover={() => setIsActionPopoverOpen(false)}
        isOpen={isActionPopoverOpen}
        anchorPosition="downRight"
        button={
          <ActionMenuButton onClick={() => setIsActionPopoverOpen(true)} />
        }
      >
        <div>
          {sections.map((section, idx) => {
            const isLastSection = idx !== sections.length - 1;
            return (
              <div key={idx}>
                {section.map((item) => (
                  <Section key={item.key}>
                    {item.title && <SectionTitle>{item.title}</SectionTitle>}
                    {item.subtitle && (
                      <SectionSubtitle>{item.subtitle}</SectionSubtitle>
                    )}
                    <SectionLinks>
                      {item.actions.map((action) => (
                        <SectionLink
                          key={action.key}
                          label={action.label}
                          href={action.href}
                        />
                      ))}
                    </SectionLinks>
                  </Section>
                ))}
                {isLastSection && <ActionMenuDivider />}
              </div>
            );
          })}

          {hasGoldLicense && (
            <CustomLinkMenuSection transaction={transaction} />
          )}
        </div>
      </ActionMenu>
    </>
  );
}
