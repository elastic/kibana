/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect, useCallback } from 'react';
import { EuiSelectOption } from '@elastic/eui';
import { HttpSetup } from 'kibana/public';
import { map } from 'lodash/fp';
import { ActionConnector } from '../../../../types';
import { getCreateIssueMetadata } from './api';

interface IssueTypes {
  [key: string]: {
    name: string;
    fields: {
      [key: string]: {
        allowedValues: Array<{ name: string; id: string }> | [];
        defaultValue: { name: string; id: string } | {};
      };
    };
  };
}

interface Props {
  http: HttpSetup;
  actionConnector: ActionConnector;
  selectedIssueType?: string;
}

export interface UseCreateIssueMetadata {
  issueTypes: IssueTypes;
  issueTypesSelectOptions: EuiSelectOption[];
  prioritiesSelectOptions: EuiSelectOption[];
  hasDescription: boolean;
  hasLabels: boolean;
}

export const useCreateIssueMetadata = ({
  http,
  actionConnector,
  selectedIssueType,
}: Props): UseCreateIssueMetadata => {
  const [issueTypes, setIssueTypes] = useState<IssueTypes>({});
  const [issueTypesSelectOptions, setIssueTypesSelectOptions] = useState<EuiSelectOption[]>([]);
  const [prioritiesSelectOptions, setPrioritiesSelectOptions] = useState<EuiSelectOption[]>([]);
  const [hasDescription, setHasDescription] = useState<boolean>(false);
  const [hasLabels, setHasLabels] = useState<boolean>(false);

  const hasField = useCallback(
    (key) => {
      if (selectedIssueType != null) {
        const fields = issueTypes[selectedIssueType]?.fields ?? {};
        return Object.prototype.hasOwnProperty.call(fields, key);
      }

      return false;
    },
    [selectedIssueType, issueTypes]
  );

  useEffect(() => {
    let cancel = false;
    const fetchData = async () => {
      const res = await getCreateIssueMetadata({
        http,
        connectorId: actionConnector.id,
      });

      if (!cancel) {
        setIssueTypes(res.data.issueTypes);
      }
    };
    fetchData();
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, actionConnector]);

  useEffect(() => {
    const options = Object.keys(issueTypes).map((key) => ({
      value: key,
      text: issueTypes[key].name ?? '',
    }));

    setIssueTypesSelectOptions(options);
  }, [issueTypes]);

  useEffect(() => {
    if (selectedIssueType != null) {
      const fields = issueTypes[selectedIssueType]?.fields ?? {};
      const priorities = fields.priority?.allowedValues ?? [];
      const options = map(
        (priority) => ({
          value: priority.name,
          text: priority.name,
        }),
        priorities
      );
      setPrioritiesSelectOptions(options);
    }
  }, [selectedIssueType, issueTypes]);

  useEffect(() => {
    setHasDescription(hasField('description'));
  }, [hasField]);

  useEffect(() => {
    setHasLabels(hasField('labels'));
  }, [hasField]);

  return {
    issueTypes,
    issueTypesSelectOptions,
    prioritiesSelectOptions,
    hasDescription,
    hasLabels,
  };
};
