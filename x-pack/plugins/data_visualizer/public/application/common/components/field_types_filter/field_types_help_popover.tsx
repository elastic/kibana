/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiFilterButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import React, { FC, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FieldIcon } from '@kbn/react-field';
import { FormattedMessage } from '@kbn/i18n-react';
import { getFieldTypeDescription } from '../../../../../common/constants';
import { useDataVisualizerKibana } from '../../../kibana_context';

interface FieldTypeTableItem {
  id: number;
  dataType: string;
  description: string;
}

export const FieldTypesHelpPopover: FC<{
  fieldTypes: string[];
}> = ({ fieldTypes }) => {
  {
    const { services } = useDataVisualizerKibana();
    const { docLinks } = services;
    const { euiTheme } = useEuiTheme();

    const [isHelpOpen, setIsHelpOpen] = useState(false);

    const onHelpClick = () => setIsHelpOpen((prevIsHelpOpen) => !prevIsHelpOpen);
    const closeHelp = () => setIsHelpOpen(false);

    const items: FieldTypeTableItem[] = useMemo(
      () =>
        fieldTypes.map((type, index) => ({
          id: index,
          dataType: type,
          description: getFieldTypeDescription(type, docLinks),
        })),
      [fieldTypes, docLinks]
    );

    const columnsSidebar = [
      {
        field: 'dataType',
        name: i18n.translate('xpack.dataVisualizer.fieldTypesPopover.dataTypeColumnTitle', {
          defaultMessage: 'Data type',
        }),
        width: '110px',
        render: (name: string) => (
          <EuiFlexGroup alignItems="center" responsive={false} gutterSize="xs">
            <EuiFlexItem grow={false}>
              <FieldIcon type={name} />
            </EuiFlexItem>
            <EuiFlexItem>{name}</EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        field: 'description',
        name: i18n.translate('xpack.dataVisualizer.fieldTypesPopover.descriptionColumnTitle', {
          defaultMessage: 'Description',
        }),
        // eslint-disable-next-line react/no-danger
        render: (description: string) => <div dangerouslySetInnerHTML={{ __html: description }} />,
      },
    ];

    const helpButton = (
      <EuiFilterButton
        grow={false}
        onClick={onHelpClick}
        data-test-subj="fieldTypesHelpButton"
        className="dataVisualizerFieldTypesHelp__button"
        aria-label={i18n.translate('xpack.dataVisualizer.fieldTypesPopover.buttonAriaLabel', {
          defaultMessage: 'Filter type help',
        })}
      >
        <EuiIcon
          type="iInCircle"
          color="primary"
          title={i18n.translate('xpack.dataVisualizer.fieldTypesPopover.iconTitle', {
            defaultMessage: 'Filter type help',
          })}
        />
      </EuiFilterButton>
    );
    return (
      <EuiPopover
        anchorPosition="downLeft"
        display="block"
        button={helpButton}
        isOpen={isHelpOpen}
        panelPaddingSize="none"
        closePopover={closeHelp}
        initialFocus="dataVisualizerFieldTypesHelpBasicTableId"
      >
        <EuiPopoverTitle paddingSize="s">
          {i18n.translate('xpack.dataVisualizer.fieldChooser.popoverTitle', {
            defaultMessage: 'Field types',
          })}
        </EuiPopoverTitle>
        <EuiPanel
          className="eui-yScroll"
          style={{ maxHeight: '50vh', maxWidth: `calc(${euiTheme.size.base}*22)` }}
          color="transparent"
          paddingSize="s"
        >
          <EuiBasicTable<FieldTypeTableItem>
            id="dataVisualizerFieldTypesHelpBasicTableId"
            tableCaption={i18n.translate('xpack.dataVisualizer.fieldTypesPopover.tableTitle', {
              defaultMessage: 'Description of field types',
            })}
            items={items}
            compressed={true}
            rowHeader="firstName"
            columns={columnsSidebar}
            responsive={false}
          />
        </EuiPanel>
        <EuiPanel color="transparent" paddingSize="s">
          <EuiText color="subdued" size="xs">
            <p>
              {i18n.translate('xpack.dataVisualizer.fieldTypesPopover.learnMoreText', {
                defaultMessage: 'Learn more about',
              })}
              &nbsp;
              <EuiLink href={docLinks.links.discover.fieldTypeHelp} target="_blank" external>
                <FormattedMessage
                  id="xpack.dataVisualizer.fieldTypesPopover.fieldTypesDocLinkLabel"
                  defaultMessage="field types"
                />
              </EuiLink>
            </p>
          </EuiText>
        </EuiPanel>
      </EuiPopover>
    );
  }
};
