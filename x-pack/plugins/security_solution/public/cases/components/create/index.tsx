/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSteps,
} from '@elastic/eui';
import styled, { css } from 'styled-components';
import { useHistory } from 'react-router-dom';
import { isEqual } from 'lodash/fp';

import {
  Field,
  Form,
  FormDataProvider,
  getUseField,
  UseField,
  useForm,
  useFormData,
} from '../../../shared_imports';
import { usePostCase } from '../../containers/use_post_case';
import { schema, FormProps } from './schema';
import { useInsertTimeline } from '../../../timelines/components/timeline/insert_timeline_popover/use_insert_timeline';
import { MarkdownEditorForm } from '../../../common/components/markdown_editor/eui_form';
import { useGetTags } from '../../containers/use_get_tags';
import { getCaseDetailsUrl } from '../../../common/components/link_to';
import { useTimelineClick } from '../../../common/utils/timeline/use_timeline_click';
import { SettingFieldsForm } from '../settings/fields_form';
import { useConnectors } from '../../containers/configure/use_connectors';
import { ConnectorSelector } from '../connector_selector/form';
import { useCaseConfigure } from '../../containers/configure/use_configure';
import {
  normalizeCaseConnector,
  getConnectorById,
  getNoneConnector,
  normalizeActionConnector,
} from '../configure_cases/utils';
import { ActionConnector } from '../../containers/types';
import { ConnectorFields } from '../../../../../case/common/api/connectors';
import * as i18n from './translations';

export const CommonUseField = getUseField({ component: Field });

interface ContainerProps {
  big?: boolean;
}

const Container = styled.div.attrs((props) => props)<ContainerProps>`
  ${({ big, theme }) => css`
    margin-top: ${big ? theme.eui.euiSizeXL : theme.eui.euiSize};
  `}
`;

const MySpinner = styled(EuiLoadingSpinner)`
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 99;
`;

const initialCaseValue: FormProps = {
  description: '',
  tags: [],
  title: '',
  connectorId: 'none',
};

export const Create = React.memo(() => {
  const history = useHistory();
  const { caseData, isLoading, postCase } = usePostCase();
  const { loading: isLoadingConnectors, connectors } = useConnectors();
  const { connector: configureConnector, loading: isLoadingCaseConfigure } = useCaseConfigure();
  const { tags: tagOptions } = useGetTags();

  const [connector, setConnector] = useState<ActionConnector | null>(null);
  const [options, setOptions] = useState(
    tagOptions.map((label) => ({
      label,
    }))
  );

  // This values uses useEffect to update, not useMemo,
  // because we need to setState on it from the jsx
  useEffect(
    () =>
      setOptions(
        tagOptions.map((label) => ({
          label,
        }))
      ),
    [tagOptions]
  );

  const [fields, setFields] = useState<ConnectorFields>(null);

  const { form } = useForm<FormProps>({
    defaultValue: initialCaseValue,
    options: { stripEmptyFields: false },
    schema,
  });
  const currentConnectorId = useMemo(
    () =>
      !isLoadingCaseConfigure
        ? normalizeCaseConnector(connectors, configureConnector)?.id ?? 'none'
        : null,
    [configureConnector, connectors, isLoadingCaseConfigure]
  );
  const { submit, setFieldValue } = form;
  const [{ description }] = useFormData<{
    description: string;
  }>({
    form,
    watch: ['description'],
  });
  const onChangeConnector = useCallback(
    (newConnectorId) => {
      if (connector == null || connector.id !== newConnectorId) {
        setConnector(getConnectorById(newConnectorId, connectors) ?? null);
        // Reset setting fields when changing connector
        setFields(null);
      }
    },
    [connector, connectors]
  );

  const onDescriptionChange = useCallback((newValue) => setFieldValue('description', newValue), [
    setFieldValue,
  ]);

  const { handleCursorChange } = useInsertTimeline(description, onDescriptionChange);

  const handleTimelineClick = useTimelineClick();

  const onSubmit = useCallback(async () => {
    const { isValid, data } = await submit();
    if (isValid) {
      const { connectorId: dataConnectorId, ...dataWithoutConnectorId } = data;
      const caseConnector = getConnectorById(dataConnectorId, connectors);
      const connectorToUpdate = caseConnector
        ? normalizeActionConnector(caseConnector, fields)
        : getNoneConnector();

      await postCase({ ...dataWithoutConnectorId, connector: connectorToUpdate });
    }
  }, [submit, postCase, fields, connectors]);

  const handleSetIsCancel = useCallback(() => {
    history.push('/');
  }, [history]);

  const firstStep = useMemo(
    () => ({
      title: i18n.STEP_ONE_TITLE,
      children: (
        <>
          <CommonUseField
            path="title"
            componentProps={{
              idAria: 'caseTitle',
              'data-test-subj': 'caseTitle',
              euiFieldProps: {
                fullWidth: false,
                disabled: isLoading,
              },
            }}
          />
          <Container>
            <CommonUseField
              path="tags"
              componentProps={{
                idAria: 'caseTags',
                'data-test-subj': 'caseTags',
                euiFieldProps: {
                  fullWidth: true,
                  placeholder: '',
                  disabled: isLoading,
                  options,
                  noSuggestions: false,
                },
              }}
            />
            <FormDataProvider pathsToWatch="tags">
              {({ tags: anotherTags }) => {
                const current: string[] = options.map((opt) => opt.label);
                const newOptions = anotherTags.reduce((acc: string[], item: string) => {
                  if (!acc.includes(item)) {
                    return [...acc, item];
                  }
                  return acc;
                }, current);
                if (!isEqual(current, newOptions)) {
                  setOptions(
                    newOptions.map((label: string) => ({
                      label,
                    }))
                  );
                }
                return null;
              }}
            </FormDataProvider>
          </Container>
          <Container big>
            <UseField
              path={'description'}
              component={MarkdownEditorForm}
              componentProps={{
                dataTestSubj: 'caseDescription',
                idAria: 'caseDescription',
                isDisabled: isLoading,
                onClickTimeline: handleTimelineClick,
                onCursorPositionUpdate: handleCursorChange,
              }}
            />
          </Container>
        </>
      ),
    }),
    [isLoading, options, handleCursorChange, handleTimelineClick]
  );

  const secondStep = useMemo(
    () => ({
      title: i18n.STEP_TWO_TITLE,
      children: (
        <EuiFlexGroup>
          <EuiFlexItem>
            <Container>
              <UseField
                path="connectorId"
                component={ConnectorSelector}
                componentProps={{
                  connectors,
                  dataTestSubj: 'caseConnectors',
                  defaultValue: currentConnectorId,
                  disabled: isLoadingConnectors,
                  idAria: 'caseConnectors',
                  isLoading,
                }}
                onChange={onChangeConnector}
              />
            </Container>
          </EuiFlexItem>
          <EuiFlexItem>
            <Container>
              <SettingFieldsForm
                connector={connector}
                fields={fields}
                isEdit={true}
                onChange={setFields}
              />
            </Container>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    }),
    [
      connector,
      connectors,
      currentConnectorId,
      fields,
      isLoading,
      isLoadingConnectors,
      onChangeConnector,
    ]
  );

  const allSteps = useMemo(() => [firstStep, secondStep], [firstStep, secondStep]);

  if (caseData != null && caseData.id) {
    history.push(getCaseDetailsUrl({ id: caseData.id }));
    return null;
  }

  return (
    <EuiPanel>
      {isLoading && <MySpinner data-test-subj="create-case-loading-spinner" size="xl" />}
      <Form form={form}>
        <EuiSteps headingElement="h2" steps={allSteps} />
      </Form>
      <Container>
        <EuiFlexGroup
          alignItems="center"
          justifyContent="flexEnd"
          gutterSize="xs"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="create-case-cancel"
              size="s"
              onClick={handleSetIsCancel}
              iconType="cross"
            >
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="create-case-submit"
              fill
              iconType="plusInCircle"
              isDisabled={isLoading}
              isLoading={isLoading}
              onClick={onSubmit}
            >
              {i18n.CREATE_CASE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Container>
    </EuiPanel>
  );
});

Create.displayName = 'Create';
