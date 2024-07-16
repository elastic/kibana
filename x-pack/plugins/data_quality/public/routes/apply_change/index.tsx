/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { calculateDiff } from '@kbn/unified-data-table/src/components/compare_documents/hooks/calculate_diff';
import React from 'react';
import { PLUGIN_NAME } from '../../../common';
import { useBreadcrumbs } from '../../utils/use_breadcrumbs';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';

function deepSortKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(deepSortKeys);
  } else if (obj !== null && typeof obj === 'object') {
    const sortedObj: { [key: string]: any } = {};
    Object.keys(obj)
      .sort()
      .forEach((key) => {
        sortedObj[key] = deepSortKeys(obj[key]);
      });
    return sortedObj;
  }
  return obj;
}

function cleanDoc(doc: any): any {
  return doc._source;
}

export const ApplyChangeRoute = () => {
  const {
    services: { chrome, appParams, http },
  } = useKibanaContextForPlugin();

  useBreadcrumbs(PLUGIN_NAME, appParams, chrome);

  const [datastream, setDataset] = React.useState<string>('logs-kubernetes.container_logs-default');
  const [code, setCode] = React.useState<string>(`{
      "grok": {
        "field": "message",
        "patterns": ["\\\\[%{LOGLEVEL:loglevel}\\\\]"],
        "ignore_failure": true
      }
    }`);

  const [plan, setPlan] = React.useState<unknown>(undefined);
  const [docI, setDocI] = React.useState<number>(0);

  return (
    <EuiFlexGroup direction="column">
      <EuiPanel>
        <EuiText size="m">
          <h1>Change to apply</h1>
        </EuiText>
        <EuiSpacer />
        <EuiForm component="form">
          <EuiFormRow label="Data stream" helpText="The datastream to apply a change to">
            <EuiFieldText
              name="datastream"
              value={datastream}
              onChange={(e) => setDataset(e.target.value)}
            />
          </EuiFormRow>
          <EuiFormRow label="Type" helpText="The type of change">
            <EuiSelect
              options={[{ value: 'pipeline_processor', text: 'Add pipeline processor' }]}
            />
          </EuiFormRow>
          <EuiFormRow label="Change" helpText="The actual change to apply">
            <CodeEditor languageId="json" value={code} onChange={setCode} height={300} />
          </EuiFormRow>
          <EuiButton
            fill
            onClick={async () => {
              const result = await http.post('/api/apply_change/plan', {
                body: JSON.stringify({
                  datastream,
                  change: JSON.parse(code),
                }),
              });
              setPlan({
                ...result,
                diff: result.simulatedRun.docs.map((after, i) =>
                  after.doc
                    ? calculateDiff({
                        diffMode: 'lines',
                        comparisonValue: deepSortKeys(cleanDoc(after.doc)),
                        baseValue: deepSortKeys(cleanDoc(result.docs[i])),
                      })
                    : after
                ),
              });
            }}
          >
            Check
          </EuiButton>
        </EuiForm>
      </EuiPanel>
      {plan && (
        <>
          <EuiPanel>
            <EuiText size="m">
              <h1>Test Run</h1>
            </EuiText>
            <EuiSpacer />
            <EuiButton onClick={() => setDocI((docI - 1) % plan.simulatedRun.docs.length)}>
              Previous
            </EuiButton>
            {docI + 1} / {plan.simulatedRun.docs.length}
            <EuiButton onClick={() => setDocI((docI + 1) % plan.simulatedRun.docs.length)}>
              Next
            </EuiButton>
            <EuiSpacer />
            <div style={{ overflowY: 'scroll', height: 500 }}>
              {plan.diff[docI].error ? (
                <EuiCallOut color="danger">
                  <pre>{JSON.stringify(plan.simulatedRun.docs[docI], null, 2)}</pre>
                  <pre>{JSON.stringify(plan.docs[docI], null, 2)}</pre>
                </EuiCallOut>
              ) : plan.diff[docI].some((d) => d.added || d.removed) ? (
                <EuiFlexGroup direction="column" gutterSize="none">
                  {plan.diff[docI].map((part, i) => (
                    <span
                      key={i}
                      style={{
                        backgroundColor: part.added
                          ? 'lightgreen'
                          : part.removed
                          ? 'lightcoral'
                          : 'white',
                      }}
                    >
                      <pre>{part.value}</pre>
                    </span>
                  ))}
                </EuiFlexGroup>
              ) : (
                <EuiCallOut>No change</EuiCallOut>
              )}
            </div>
          </EuiPanel>
          <EuiPanel>
            <EuiText size="m">
              <h1>Plan</h1>
            </EuiText>
            <EuiSpacer />
            <pre>{JSON.stringify(plan.plan, null, 2)}</pre>
          </EuiPanel>
        </>
      )}
    </EuiFlexGroup>
  );
};
