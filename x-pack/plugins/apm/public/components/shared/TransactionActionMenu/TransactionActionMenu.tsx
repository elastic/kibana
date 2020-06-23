/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useMemo, useState, MouseEvent } from 'react';
import url from 'url';
import { Filter } from '../../../../common/custom_link/custom_link_types';
import { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import {
  ActionMenu,
  ActionMenuDivider,
  Section,
  SectionLink,
  SectionLinks,
  SectionSubtitle,
  SectionTitle,
} from '../../../../../observability/public';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';
import { useFetcher } from '../../../hooks/useFetcher';
import { useLocation } from '../../../hooks/useLocation';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { CustomLinkFlyout } from '../../app/Settings/CustomizeUI/CustomLink/CustomLinkFlyout';
import { CustomLink } from './CustomLink';
import { CustomLinkPopover } from './CustomLink/CustomLinkPopover';
import { getSections } from './sections';
import { useLicense } from '../../../hooks/useLicense';
import { convertFiltersToQuery } from '../../app/Settings/CustomizeUI/CustomLink/CustomLinkFlyout/helper';

interface Props {
  readonly transaction: Transaction;
}

const ActionMenuButton = ({ onClick }: { onClick: () => void }) => (
  <EuiButtonEmpty iconType="arrowDown" iconSide="right" onClick={onClick}>
    {i18n.translate('xpack.apm.transactionActionMenu.actionsButtonLabel', {
      defaultMessage: 'Actions',
    })}
  </EuiButtonEmpty>
);

export const TransactionActionMenu: FunctionComponent<Props> = ({
  transaction,
}: Props) => {
  const license = useLicense();
  const hasValidLicense = license?.isActive && license?.hasAtLeast('gold');

  const { core } = useApmPluginContext();
  const location = useLocation();
  const { urlParams } = useUrlParams();

  const [isActionPopoverOpen, setIsActionPopoverOpen] = useState(false);
  const [isCustomLinksPopoverOpen, setIsCustomLinksPopoverOpen] = useState(
    false
  );
  const [isCustomLinkFlyoutOpen, setIsCustomLinkFlyoutOpen] = useState(false);

  const filters = useMemo(
    () =>
      [
        { key: 'service.name', value: transaction?.service.name },
        { key: 'service.environment', value: transaction?.service.environment },
        { key: 'transaction.name', value: transaction?.transaction.name },
        { key: 'transaction.type', value: transaction?.transaction.type },
      ].filter((filter): filter is Filter => typeof filter.value === 'string'),
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [transaction]
  );

  const { data: customLinks = [], status, refetch } = useFetcher(
    (callApmApi) =>
      callApmApi({
        pathname: '/api/apm/settings/custom_links',
        params: { query: convertFiltersToQuery(filters) },
      }),
    [filters]
  );

  const sections = getSections({
    transaction,
    basePath: core.http.basePath,
    location,
    urlParams,
  }).map((sectionList) =>
    sectionList.map((section) => ({
      ...section,
      actions: section.actions.map((action) => {
        const { href } = action;

        // use navigateToApp as a temporary workaround for faster navigation between observability apps.
        // see https://github.com/elastic/kibana/issues/65682

        return {
          ...action,
          onClick: (event: MouseEvent) => {
            const parsed = url.parse(href);

            const appPathname = core.http.basePath.remove(
              parsed.pathname ?? ''
            );

            const [, , app, ...rest] = appPathname.split('/');

            if (app === 'uptime' || app === 'metrics' || app === 'logs') {
              event.preventDefault();
              const search = parsed.search || '';

              const path = `${rest.join('/')}${search}`;
              core.application.navigateToApp(app, {
                path,
              });
            }
          },
        };
      }),
    }))
  );

  const closePopover = () => {
    setIsActionPopoverOpen(false);
    setIsCustomLinksPopoverOpen(false);
  };

  const toggleCustomLinkFlyout = () => {
    closePopover();
    setIsCustomLinkFlyoutOpen((isOpen) => !isOpen);
  };

  const toggleCustomLinkPopover = () => {
    setIsCustomLinksPopoverOpen((isOpen) => !isOpen);
  };

  return (
    <>
      {isCustomLinkFlyoutOpen && (
        <CustomLinkFlyout
          defaults={{ filters }}
          onClose={toggleCustomLinkFlyout}
          onSave={() => {
            toggleCustomLinkFlyout();
            refetch();
          }}
          onDelete={() => {
            toggleCustomLinkFlyout();
            refetch();
          }}
        />
      )}
      <ActionMenu
        id="transactionActionMenu"
        closePopover={closePopover}
        isOpen={isActionPopoverOpen}
        anchorPosition="downRight"
        button={
          <ActionMenuButton onClick={() => setIsActionPopoverOpen(true)} />
        }
      >
        <div>
          {isCustomLinksPopoverOpen ? (
            <CustomLinkPopover
              customLinks={customLinks.slice(3, customLinks.length)}
              onCreateCustomLinkClick={toggleCustomLinkFlyout}
              onClose={toggleCustomLinkPopover}
              transaction={transaction}
            />
          ) : (
            <>
              {sections.map((section, idx) => {
                const isLastSection = idx !== sections.length - 1;
                return (
                  <div key={idx}>
                    {section.map((item) => (
                      <Section key={item.key}>
                        {item.title && (
                          <SectionTitle>{item.title}</SectionTitle>
                        )}
                        {item.subtitle && (
                          <SectionSubtitle>{item.subtitle}</SectionSubtitle>
                        )}
                        <SectionLinks>
                          {item.actions.map((action) => (
                            <SectionLink
                              key={action.key}
                              label={action.label}
                              href={action.href}
                              onClick={action.onClick}
                            />
                          ))}
                        </SectionLinks>
                      </Section>
                    ))}
                    {isLastSection && <ActionMenuDivider />}
                  </div>
                );
              })}
              {hasValidLicense && (
                <CustomLink
                  customLinks={customLinks}
                  status={status}
                  onCreateCustomLinkClick={toggleCustomLinkFlyout}
                  onSeeMoreClick={toggleCustomLinkPopover}
                  transaction={transaction}
                />
              )}
            </>
          )}
        </div>
      </ActionMenu>
    </>
  );
};
