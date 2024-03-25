/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import { IncludeCitationsField } from './include_citations_field';
import { InstructionsField } from './instructions_field';
import { ChatFormFields } from '../../types';
import { OpenAIKeyFlyOut } from './open_ai_key_flyout';
import { OpenAISummarizationModel } from './open_ai_summarization_model';

export const SummarizationPanel: React.FC = () => {
  const { control } = useFormContext();
  const [isOpenAIFlyOutOpen, setIsOpenAIFlyOutOpen] = useState<boolean>(false);

  const onCloseOpenAIFlyOut = () => {
    setIsOpenAIFlyOutOpen(!isOpenAIFlyOutOpen);
  };
  const handleOpenAIFlyOut = () => {
    setIsOpenAIFlyOutOpen(true);
  };

  return (
    <>
      {isOpenAIFlyOutOpen && (
        <Controller
          name={ChatFormFields.openAIKey}
          control={control}
          defaultValue=""
          render={({ field }) => (
            <OpenAIKeyFlyOut
              openAPIKey={field.value}
              onSave={field.onChange}
              onClose={onCloseOpenAIFlyOut}
            />
          )}
        />
      )}

      <Controller
        name={ChatFormFields.summarizationModel}
        control={control}
        render={({ field }) => (
          <OpenAISummarizationModel
            model={field.value}
            onSelect={field.onChange}
            openAIFlyOutOpen={handleOpenAIFlyOut}
          />
        )}
      />

      <Controller
        name={ChatFormFields.prompt}
        control={control}
        defaultValue=""
        render={({ field }) => <InstructionsField value={field.value} onChange={field.onChange} />}
      />

      <Controller
        name={ChatFormFields.citations}
        control={control}
        defaultValue={true}
        render={({ field }) => (
          <IncludeCitationsField checked={field.value} onChange={field.onChange} />
        )}
      />
    </>
  );
};
