import { CategorizationState } from '../../types';
import { ECS_EVENT_TYPES_PER_CATEGORY, EVENT_CATEGORIES, EVENT_TYPES } from './constants';

interface Event {
  type?: string[];
  category?: string[];
}

interface PipelineResult {
  event?: Event;
}

interface ErrorMessage {
  error: string;
}

export function handleCategorizationValidation(state: CategorizationState): {
  invalidCategorization: ErrorMessage[];
  lastExecutedChain: string;
} {
  const errors: ErrorMessage[] = [];
  const pipelineResults = state.pipelineResults as PipelineResult[];

  // Loops through the pipeline results to find invalid categories and types
  for (const doc of pipelineResults) {
    let types: string[] = [];
    let categories: string[] = [];
    if (doc?.event?.type) {
      types = doc.event.type;
    }
    if (doc?.event?.category) {
      categories = doc.event.category;
    }

    const invalidCategories = findInvalidCategories(categories);
    const invalidTypes = findInvalidTypes(types);

    if (invalidCategories.length > 0) {
      errors.push(createErrorMessage('event.category', invalidCategories, EVENT_CATEGORIES));
    }

    if (invalidTypes.length > 0) {
      errors.push(createErrorMessage('event.type', invalidTypes, EVENT_TYPES));
    }

    // Compatibility check is done only on valid categories and types
    const validCategories = categories.filter((x) => !invalidCategories.includes(x));
    const validTypes = types.filter((x) => !invalidTypes.includes(x));

    const compatibleErrors = getTypeCategoryIncompatibleError(validCategories, validTypes);
    for (const ce of compatibleErrors) {
      errors.push(ce);
    }
  }

  return {
    invalidCategorization: errors,
    lastExecutedChain: 'handleCategorizationValidation',
  };
}

function createErrorMessage(
  field: string,
  errorList: string[],
  allowedValues: string[]
): ErrorMessage {
  return {
    error: `field ${field}'s values (${errorList.join(
      ', '
    )}) is not one of the allowed values (${allowedValues.join(', ')})`,
  };
}

function findInvalidCategories(categories: string[]): string[] {
  const invalidCategories: string[] = [];
  for (const c of categories) {
    if (!EVENT_CATEGORIES.includes(c)) {
      invalidCategories.push(c);
    }
  }
  return invalidCategories;
}

function findInvalidTypes(types: string[]): string[] {
  const invalidTypes: string[] = [];
  for (const t of types) {
    if (!EVENT_TYPES.includes(t)) {
      invalidTypes.push(t);
    }
  }
  return invalidTypes;
}

type EventCategories =
  | 'api'
  | 'authentication'
  | 'configuration'
  | 'database'
  | 'driver'
  | 'email'
  | 'file'
  | 'host'
  | 'iam'
  | 'intrusion_detection'
  | 'library'
  | 'network'
  | 'package'
  | 'process'
  | 'registry'
  | 'session'
  | 'threat'
  | 'user'
  | 'vulnerability'
  | 'web';

function getTypeCategoryIncompatibleError(categories: string[], types: string[]): ErrorMessage[] {
  const errors: ErrorMessage[] = [];
  let unmatchedTypes = new Set(types);
  const matchCategories = new Set(categories);
  let categoryExists = false;

  for (const c of matchCategories) {
    if (c in ECS_EVENT_TYPES_PER_CATEGORY) {
      categoryExists = true;
      const matchTypes = new Set(ECS_EVENT_TYPES_PER_CATEGORY[c as EventCategories]);
      unmatchedTypes = new Set([...unmatchedTypes].filter((x) => !matchTypes.has(x)));
    }
  }

  if (categoryExists && unmatchedTypes.size > 0) {
    errors.push({
      error: `event.type (${[...unmatchedTypes].join(
        ', '
      )}) not compatible with any of the event.category (${[...matchCategories].join(', ')})`,
    });
  }

  return errors;
}
