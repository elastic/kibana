/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ReactNode, OptionHTMLAttributes } from 'react';

import { NormalizedField } from './document_fields';
import { Mappings } from './state';

export type OnUpdateHandler = (arg: OnUpdateHandlerArg) => void;

export interface OnUpdateHandlerArg {
  isValid?: boolean;
  getData: () => Mappings | undefined;
  validate: () => Promise<boolean>;
}

export type FieldsEditor = 'default' | 'json';

export interface IndexSettingsInterface {
  analysis?: {
    analyzer: {
      [key: string]: {
        type: string;
        tokenizer: string;
        char_filter?: string[];
        filter?: string[];
        position_increment_gap?: number;
      };
    };
  };
}

/**
 * When we define the index settings we can skip
 * the "index" property and directly add the "analysis".
 * ES always returns the settings wrapped under "index".
 */
export type IndexSettings = IndexSettingsInterface | { index: IndexSettingsInterface };

export type SelectOption<T extends string = string> = {
  value: unknown;
  text: T | ReactNode;
} & OptionHTMLAttributes<HTMLOptionElement>;

export interface ComboBoxOption {
  label: string;
  value?: unknown;
}

export interface SuperSelectOption {
  value: unknown;
  inputDisplay?: ReactNode;
  dropdownDisplay?: ReactNode;
  disabled?: boolean;
  'data-test-subj'?: string;
}

export interface SearchResult {
  display: JSX.Element;
  field: NormalizedField;
}

export interface SearchMetadata {
  /**
   * Whether or not the search term match some part of the field path.
   */
  matchPath: boolean;
  /**
   * If the search term matches the field type we will give it a higher score.
   */
  matchType: boolean;
  /**
   * If the last word of the search terms matches the field name
   */
  matchFieldName: boolean;
  /**
   * If the search term matches the beginning of the path we will give it a higher score
   */
  matchStartOfPath: boolean;
  /**
   * If the last word of the search terms fully matches the field name
   */
  fullyMatchFieldName: boolean;
  /**
   * If the search term exactly matches the field type
   */
  fullyMatchType: boolean;
  /**
   * If the search term matches the full field path
   */
  fullyMatchPath: boolean;
  /**
   * The score of the result that will allow us to sort the list
   */
  score: number;
  /**
   * The JSX with <strong> tag wrapping the matched string
   */
  display: JSX.Element;
  /**
   * The field path substring that matches the search
   */
  stringMatch: string | null;
}

export interface GenericObject {
  [key: string]: any;
}
