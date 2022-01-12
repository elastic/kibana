/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { ReindexStatus, ReindexStep } from '../../../../../../../common/types';
import { LoadingState } from '../../../../types';
import type { ReindexState } from '../use_reindex_state';
import { ReindexProgress } from './progress';

describe('ReindexProgress', () => {
  it('renders', () => {
    const wrapper = shallow(
      <ReindexProgress
        reindexState={
          {
            lastCompletedStep: ReindexStep.created,
            status: ReindexStatus.inProgress,
            reindexTaskPercComplete: null,
            errorMessage: null,
            loadingState: LoadingState.Success,
            meta: {
              indexName: 'foo',
              reindexName: 'reindexed-foo',
              aliases: [],
            },
          } as ReindexState
        }
        cancelReindex={jest.fn()}
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
      <Fragment>
        <EuiTitle
          data-test-subj="reindexChecklistTitle"
          size="xs"
        >
          <h3>
            <FormattedMessage
              defaultMessage="Reindexing in progress… {percents}"
              id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingInProgressTitle"
              values={
                Object {
                  "percents": "0%",
                }
              }
            />
          </h3>
        </EuiTitle>
        <StepProgress
          steps={
            Array [
              Object {
                "status": "inProgress",
                "title": <FormattedMessage
                  defaultMessage="Setting {indexName} index to read-only."
                  id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.inProgress.readonlyStepTitle"
                  values={
                    Object {
                      "indexName": <EuiCode>
                        foo
                      </EuiCode>,
                    }
                  }
                />,
              },
              Object {
                "status": "incomplete",
                "title": <FormattedMessage
                  defaultMessage="Create {reindexName} index."
                  id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.createIndexStepTitle"
                  values={
                    Object {
                      "reindexName": <EuiCode>
                        reindexed-foo
                      </EuiCode>,
                    }
                  }
                />,
              },
              Object {
                "status": "incomplete",
                "title": <ReindexingDocumentsStepTitle
                  cancelReindex={[MockFunction]}
                  reindexState={
                    Object {
                      "errorMessage": null,
                      "lastCompletedStep": 0,
                      "loadingState": 1,
                      "meta": Object {
                        "aliases": Array [],
                        "indexName": "foo",
                        "reindexName": "reindexed-foo",
                      },
                      "reindexTaskPercComplete": null,
                      "status": 0,
                    }
                  }
                />,
              },
              Object {
                "status": "incomplete",
                "title": <FormattedMessage
                  defaultMessage="Create {indexName} alias for {reindexName} index."
                  id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.aliasCreatedStepTitle"
                  values={
                    Object {
                      "indexName": <EuiCode>
                        foo
                      </EuiCode>,
                      "reindexName": <EuiCode>
                        reindexed-foo
                      </EuiCode>,
                    }
                  }
                />,
              },
              Object {
                "status": "incomplete",
                "title": <FormattedMessage
                  defaultMessage="Delete original {indexName} index."
                  id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.originalIndexDeletedStepTitle"
                  values={
                    Object {
                      "indexName": <EuiCode>
                        foo
                      </EuiCode>,
                    }
                  }
                />,
              },
            ]
          }
        />
      </Fragment>
    `);
  });

  it('displays errors in the step that failed', () => {
    const wrapper = shallow(
      <ReindexProgress
        reindexState={
          {
            lastCompletedStep: ReindexStep.reindexCompleted,
            status: ReindexStatus.failed,
            reindexTaskPercComplete: 1,
            errorMessage: `This is an error that happened on alias switch`,
            loadingState: LoadingState.Success,
            meta: {
              indexName: 'foo',
              reindexName: 'reindexed-foo',
              aliases: [],
            },
          } as ReindexState
        }
        cancelReindex={jest.fn()}
      />
    );
    const aliasStep = (wrapper.find('StepProgress').props() as any).steps[3];
    expect(aliasStep.children.props.errorMessage).toEqual(
      `This is an error that happened on alias switch`
    );
  });
});
