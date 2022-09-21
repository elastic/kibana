/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import { StyledConditionContent } from './conditions.styles';
import { EntryContent } from './entry_content/entry_content';
import { OsCondition } from './os_conditions/os_conditions';
import type { CriteriaConditionsProps } from './types';

export const ExceptionItemCardConditions = memo<CriteriaConditionsProps>(
  ({ os, entries, dataTestSubj }) => {
    return (
      <StyledConditionContent
        color="subdued"
        hasBorder={true}
        hasShadow={false}
        data-test-subj={dataTestSubj}
        className="eui-xScroll"
      >
        <OsCondition os={os} dataTestSubj={dataTestSubj} />

        {entries.map((entry, index) => {
          const nestedEntries = 'entries' in entry ? entry.entries : [];
          return (
            <div key={`ExceptionItemCardConditions-Container-${index}`}>
              <EntryContent
                key={`entry-${index}`}
                entry={entry}
                index={index}
                dataTestSubj={dataTestSubj}
              />
              {nestedEntries?.length &&
                nestedEntries.map((nestedEntry, nestedIndex) => (
                  <EntryContent
                    key={`nestedEntry-${index}-${nestedIndex}`}
                    entry={nestedEntry}
                    index={nestedIndex}
                    isNestedEntry={true}
                    dataTestSubj={dataTestSubj}
                  />
                ))}
            </div>
          );
        })}
      </StyledConditionContent>
    );
  }
);
ExceptionItemCardConditions.displayName = 'ExceptionItemCardConditions';
