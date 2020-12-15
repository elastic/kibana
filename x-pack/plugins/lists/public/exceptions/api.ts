/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  ENDPOINT_LIST_URL,
  EXCEPTION_LIST_ITEM_URL,
  EXCEPTION_LIST_NAMESPACE,
  EXCEPTION_LIST_NAMESPACE_AGNOSTIC,
  EXCEPTION_LIST_URL,
} from '../../common/constants';
import {
  CreateEndpointListSchema,
  ExceptionListItemSchema,
  ExceptionListSchema,
  FoundExceptionListItemSchema,
  FoundExceptionListSchema,
  createEndpointListSchema,
  createExceptionListItemSchema,
  createExceptionListSchema,
  deleteExceptionListItemSchema,
  deleteExceptionListSchema,
  exceptionListItemSchema,
  exceptionListSchema,
  findExceptionListItemSchema,
  findExceptionListSchema,
  foundExceptionListItemSchema,
  foundExceptionListSchema,
  readExceptionListItemSchema,
  readExceptionListSchema,
  updateExceptionListItemSchema,
  updateExceptionListSchema,
} from '../../common/schemas';
import { validate } from '../../common/shared_imports';

import {
  AddEndpointExceptionListProps,
  AddExceptionListItemProps,
  AddExceptionListProps,
  ApiCallByIdProps,
  ApiCallByListIdProps,
  ApiCallFetchExceptionListsProps,
  UpdateExceptionListItemProps,
  UpdateExceptionListProps,
} from './types';

/**
 * Add new ExceptionList
 *
 * @param http Kibana http service
 * @param list exception list to add
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 *
 */
export const addExceptionList = async ({
  http,
  list,
  signal,
}: AddExceptionListProps): Promise<ExceptionListSchema> => {
  const [validatedRequest, errorsRequest] = validate(list, createExceptionListSchema);

  if (validatedRequest != null) {
    try {
      const response = await http.fetch<ExceptionListItemSchema>(EXCEPTION_LIST_URL, {
        body: JSON.stringify(list),
        method: 'POST',
        signal,
      });

      const [validatedResponse, errorsResponse] = validate(response, exceptionListSchema);

      if (errorsResponse != null || validatedResponse == null) {
        return Promise.reject(errorsResponse);
      } else {
        return Promise.resolve(validatedResponse);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  } else {
    return Promise.reject(errorsRequest);
  }
};

/**
 * Add new ExceptionListItem
 *
 * @param http Kibana http service
 * @param listItem exception list item to add
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 *
 */
export const addExceptionListItem = async ({
  http,
  listItem,
  signal,
}: AddExceptionListItemProps): Promise<ExceptionListItemSchema> => {
  const [validatedRequest, errorsRequest] = validate(listItem, createExceptionListItemSchema);

  if (validatedRequest != null) {
    try {
      const response = await http.fetch<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
        body: JSON.stringify(listItem),
        method: 'POST',
        signal,
      });

      const [validatedResponse, errorsResponse] = validate(response, exceptionListItemSchema);

      if (errorsResponse != null || validatedResponse == null) {
        return Promise.reject(errorsResponse);
      } else {
        return Promise.resolve(validatedResponse);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  } else {
    return Promise.reject(errorsRequest);
  }
};

/**
 * Update existing ExceptionList
 *
 * @param http Kibana http service
 * @param list exception list to add
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 *
 */
export const updateExceptionList = async ({
  http,
  list,
  signal,
}: UpdateExceptionListProps): Promise<ExceptionListSchema> => {
  const [validatedRequest, errorsRequest] = validate(list, updateExceptionListSchema);

  if (validatedRequest != null) {
    try {
      const response = await http.fetch<ExceptionListSchema>(EXCEPTION_LIST_URL, {
        body: JSON.stringify(list),
        method: 'PUT',
        signal,
      });

      const [validatedResponse, errorsResponse] = validate(response, exceptionListSchema);

      if (errorsResponse != null || validatedResponse == null) {
        return Promise.reject(errorsResponse);
      } else {
        return Promise.resolve(validatedResponse);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  } else {
    return Promise.reject(errorsRequest);
  }
};

/**
 * Update existing ExceptionListItem
 *
 * @param http Kibana http service
 * @param listItem exception list item to add
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 *
 */
export const updateExceptionListItem = async ({
  http,
  listItem,
  signal,
}: UpdateExceptionListItemProps): Promise<ExceptionListItemSchema> => {
  const [validatedRequest, errorsRequest] = validate(listItem, updateExceptionListItemSchema);

  if (validatedRequest != null) {
    try {
      const response = await http.fetch<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
        body: JSON.stringify(listItem),
        method: 'PUT',
        signal,
      });

      const [validatedResponse, errorsResponse] = validate(response, exceptionListItemSchema);

      if (errorsResponse != null || validatedResponse == null) {
        return Promise.reject(errorsResponse);
      } else {
        return Promise.resolve(validatedResponse);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  } else {
    return Promise.reject(errorsRequest);
  }
};

/**
 * Fetch all ExceptionLists (optionally by namespaceType)
 *
 * @param http Kibana http service
 * @param namespaceTypes ExceptionList namespace_types of lists to find
 * @param filters search bar filters
 * @param pagination optional
 * @param signal to cancel request
 *
 * @throws An error if request params or response is not OK
 */
export const fetchExceptionLists = async ({
  http,
  filters,
  namespaceTypes,
  pagination,
  signal,
}: ApiCallFetchExceptionListsProps): Promise<FoundExceptionListSchema> => {
  const query = {
    filter: filters,
    namespace_type: namespaceTypes,
    page: pagination.page ? `${pagination.page}` : '1',
    per_page: pagination.perPage ? `${pagination.perPage}` : '20',
    sort_field: 'exception-list.created_at',
    sort_order: 'desc',
  };

  const [validatedRequest, errorsRequest] = validate(query, findExceptionListSchema);

  if (validatedRequest != null) {
    try {
      const response = await http.fetch<ExceptionListSchema>(`${EXCEPTION_LIST_URL}/_find`, {
        method: 'GET',
        query,
        signal,
      });

      const [validatedResponse, errorsResponse] = validate(response, foundExceptionListSchema);

      if (errorsResponse != null || validatedResponse == null) {
        return Promise.reject(errorsResponse);
      } else {
        return Promise.resolve(validatedResponse);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  } else {
    return Promise.reject(errorsRequest);
  }
};

/**
 * Fetch an ExceptionList by providing a ExceptionList ID
 *
 * @param http Kibana http service
 * @param id ExceptionList ID (not list_id)
 * @param namespaceType ExceptionList namespace_type
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const fetchExceptionListById = async ({
  http,
  id,
  namespaceType,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListSchema> => {
  const [validatedRequest, errorsRequest] = validate(
    { id, namespace_type: namespaceType },
    readExceptionListSchema
  );

  if (validatedRequest != null) {
    try {
      const response = await http.fetch<ExceptionListSchema>(EXCEPTION_LIST_URL, {
        method: 'GET',
        query: { id, namespace_type: namespaceType },
        signal,
      });

      const [validatedResponse, errorsResponse] = validate(response, exceptionListSchema);

      if (errorsResponse != null || validatedResponse == null) {
        return Promise.reject(errorsResponse);
      } else {
        return Promise.resolve(validatedResponse);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  } else {
    return Promise.reject(errorsRequest);
  }
};

/**
 * Fetch an ExceptionList's ExceptionItems by providing a ExceptionList list_id
 *
 * @param http Kibana http service
 * @param listIds ExceptionList list_ids (not ID)
 * @param namespaceTypes ExceptionList namespace_types
 * @param filterOptions optional - filter by field or tags
 * @param pagination optional
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const fetchExceptionListsItemsByListIds = async ({
  http,
  listIds,
  namespaceTypes,
  filterOptions,
  pagination,
  signal,
}: ApiCallByListIdProps): Promise<FoundExceptionListItemSchema> => {
  const filters: string = filterOptions
    .map<string>((filter, index) => {
      const namespace = namespaceTypes[index];
      const filterNamespace =
        namespace === 'agnostic' ? EXCEPTION_LIST_NAMESPACE_AGNOSTIC : EXCEPTION_LIST_NAMESPACE;
      const formattedFilters = [
        ...(filter.filter.length
          ? [`${filterNamespace}.attributes.entries.field:${filter.filter}*`]
          : []),
        ...(filter.tags.length
          ? filter.tags.map((t) => `${filterNamespace}.attributes.tags:${t}`)
          : []),
      ];

      return formattedFilters.join(' AND ');
    })
    .join(',');

  const query = {
    list_id: listIds.join(','),
    namespace_type: namespaceTypes.join(','),
    page: pagination.page ? `${pagination.page}` : '1',
    per_page: pagination.perPage ? `${pagination.perPage}` : '20',
    sort_field: 'exception-list.created_at',
    sort_order: 'desc',
    ...(filters.trim() !== '' ? { filter: filters } : {}),
  };
  const [validatedRequest, errorsRequest] = validate(query, findExceptionListItemSchema);

  if (validatedRequest != null) {
    try {
      const response = await http.fetch<FoundExceptionListItemSchema>(
        `${EXCEPTION_LIST_ITEM_URL}/_find`,
        {
          method: 'GET',
          query,
          signal,
        }
      );

      const [validatedResponse, errorsResponse] = validate(response, foundExceptionListItemSchema);

      if (errorsResponse != null || validatedResponse == null) {
        return Promise.reject(errorsResponse);
      } else {
        return Promise.resolve(validatedResponse);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  } else {
    return Promise.reject(errorsRequest);
  }
};

/**
 * Fetch an ExceptionListItem by providing a ExceptionListItem ID
 *
 * @param http Kibana http service
 * @param id ExceptionListItem ID (not item_id)
 * @param namespaceType ExceptionList namespace_type
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const fetchExceptionListItemById = async ({
  http,
  id,
  namespaceType,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListItemSchema> => {
  const [validatedRequest, errorsRequest] = validate(
    { id, namespace_type: namespaceType },
    readExceptionListItemSchema
  );

  if (validatedRequest != null) {
    try {
      const response = await http.fetch<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
        method: 'GET',
        query: { id, namespace_type: namespaceType },
        signal,
      });
      const [validatedResponse, errorsResponse] = validate(response, exceptionListItemSchema);

      if (errorsResponse != null || validatedResponse == null) {
        return Promise.reject(errorsResponse);
      } else {
        return Promise.resolve(validatedResponse);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  } else {
    return Promise.reject(errorsRequest);
  }
};

/**
 * Delete an ExceptionList by providing a ExceptionList ID
 *
 * @param http Kibana http service
 * @param id ExceptionList ID (not list_id)
 * @param namespaceType ExceptionList namespace_type
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const deleteExceptionListById = async ({
  http,
  id,
  namespaceType,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListSchema> => {
  const [validatedRequest, errorsRequest] = validate(
    { id, namespace_type: namespaceType },
    deleteExceptionListSchema
  );

  if (validatedRequest != null) {
    try {
      const response = await http.fetch<ExceptionListSchema>(EXCEPTION_LIST_URL, {
        method: 'DELETE',
        query: { id, namespace_type: namespaceType },
        signal,
      });

      const [validatedResponse, errorsResponse] = validate(response, exceptionListSchema);

      if (errorsResponse != null || validatedResponse == null) {
        return Promise.reject(errorsResponse);
      } else {
        return Promise.resolve(validatedResponse);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  } else {
    return Promise.reject(errorsRequest);
  }
};

/**
 * Delete an ExceptionListItem by providing a ExceptionListItem ID
 *
 * @param http Kibana http service
 * @param id ExceptionListItem ID (not item_id)
 * @param namespaceType ExceptionList namespace_type
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const deleteExceptionListItemById = async ({
  http,
  id,
  namespaceType,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListItemSchema> => {
  const [validatedRequest, errorsRequest] = validate(
    { id, namespace_type: namespaceType },
    deleteExceptionListItemSchema
  );

  if (validatedRequest != null) {
    try {
      const response = await http.fetch<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
        method: 'DELETE',
        query: { id, namespace_type: namespaceType },
        signal,
      });

      const [validatedResponse, errorsResponse] = validate(response, exceptionListItemSchema);

      if (errorsResponse != null || validatedResponse == null) {
        return Promise.reject(errorsResponse);
      } else {
        return Promise.resolve(validatedResponse);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  } else {
    return Promise.reject(errorsRequest);
  }
};

/**
 * Add new Endpoint ExceptionList
 *
 * @param http Kibana http service
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 *
 */
export const addEndpointExceptionList = async ({
  http,
  signal,
}: AddEndpointExceptionListProps): Promise<CreateEndpointListSchema> => {
  try {
    const response = await http.fetch<ExceptionListItemSchema>(ENDPOINT_LIST_URL, {
      method: 'POST',
      signal,
    });

    const [validatedResponse, errorsResponse] = validate(response, createEndpointListSchema);

    if (errorsResponse != null || validatedResponse == null) {
      return Promise.reject(errorsResponse);
    } else {
      return Promise.resolve(validatedResponse);
    }
  } catch (error) {
    return Promise.reject(error);
  }
};
