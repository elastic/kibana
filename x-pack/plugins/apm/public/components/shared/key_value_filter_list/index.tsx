/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import styled from 'styled-components';
import { px, units } from '../../../style/variables';

interface KeyValue {
  key: string;
  value: any | undefined;
}

const StyledEuiAccordion = styled(EuiAccordion)`
  width: 100%;
  .buttonContentContainer .euiIEFlexWrapFix {
    width: 100%;
  }
`;

const StyledEuiDescriptionList = styled(EuiDescriptionList)`
  margin: ${px(units.half)} ${px(units.half)} 0 ${px(units.half)};
  .descriptionList__title,
  .descriptionList__description {
    border-bottom: ${({ theme }) => theme.eui.euiBorderThin};
    margin-top: 0;
    align-items: center;
    display: flex;
`;

const ValueContainer = styled.div`
  display: flex;
  align-items: center;
`;

function removeEmptyValues(items: KeyValue[]) {
  return items.filter(({ value }) => value !== undefined);
}

export function KeyValueFilterList({
  icon,
  title,
  keyValueList,
  initialIsOpen = false,
  onClickFilter,
}: {
  title: string;
  keyValueList: KeyValue[];
  initialIsOpen?: boolean;
  icon?: string;
  onClickFilter: (filter: { key: string; value: any }) => void;
}) {
  const nonEmptyKeyValueList = removeEmptyValues(keyValueList);
  if (!nonEmptyKeyValueList.length) {
    return null;
  }

  return (
    <StyledEuiAccordion
      initialIsOpen={initialIsOpen}
      id={title}
      buttonContent={<AccordionButtonContent icon={icon} title={title} />}
      buttonClassName="buttonContentContainer"
    >
      <StyledEuiDescriptionList type="column">
        {nonEmptyKeyValueList.map(({ key, value }) => {
          return (
            <Fragment key={key}>
              <EuiDescriptionListTitle
                className="descriptionList__title"
                style={{ width: '20%' }}
              >
                <EuiText size="s" style={{ fontWeight: 'bold' }}>
                  {key}
                </EuiText>
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription
                className="descriptionList__description"
                style={{ width: '80%' }}
              >
                <ValueContainer>
                  <EuiButtonEmpty
                    onClick={() => {
                      onClickFilter({ key, value });
                    }}
                    data-test-subj={`filter_by_${key}`}
                  >
                    <EuiToolTip
                      position="top"
                      content={i18n.translate(
                        'xpack.apm.keyValueFilterList.actionFilterLabel',
                        { defaultMessage: 'Filter by value' }
                      )}
                    >
                      <EuiIcon type="filter" color="black" size="m" />
                    </EuiToolTip>
                  </EuiButtonEmpty>
                  <EuiText size="s">{value}</EuiText>
                </ValueContainer>
              </EuiDescriptionListDescription>
            </Fragment>
          );
        })}
      </StyledEuiDescriptionList>
    </StyledEuiAccordion>
  );
}

function AccordionButtonContent({
  icon,
  title,
}: {
  icon?: string;
  title: string;
}) {
  return (
    <EuiFlexGroup responsive={false} gutterSize="s">
      {icon && (
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={icon}
            size="l"
            title={title}
            data-test-subj="accordion_title_icon"
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiText>{title}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
