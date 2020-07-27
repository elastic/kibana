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
  createEndpointListSchema,
  createExceptionListItemSchema,
  createExceptionListSchema,
  deleteExceptionListItemSchema,
  deleteExceptionListSchema,
  exceptionListItemSchema,
  exceptionListSchema,
  findExceptionListItemSchema,
  foundExceptionListItemSchema,
  readExceptionListItemSchema,
  readExceptionListSchema,
  updateExceptionListItemSchema,
  updateExceptionListSchema,
} from '../../common/schemas';
import { validate } from '../../common/siem_common_deps';

import {
  AddEndpointExceptionListProps,
  AddExceptionListItemProps,
  AddExceptionListProps,
  ApiCallByIdProps,
  ApiCallByListIdProps,
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
 * @param listId ExceptionList list_id (not ID)
 * @param namespaceType ExceptionList namespace_type
 * @param filterOptions optional - filter by field or tags
 * @param pagination optional
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const fetchExceptionListItemsByListId = async ({
  http,
  listId,
  namespaceType,
  filterOptions = {
    filter: '',
    tags: [],
  },
  pagination,
  signal,
}: ApiCallByListIdProps): Promise<FoundExceptionListItemSchema> => {
  const namespace =
    namespaceType === 'agnostic' ? EXCEPTION_LIST_NAMESPACE_AGNOSTIC : EXCEPTION_LIST_NAMESPACE;
  const filters = [
    ...(filterOptions.filter.length
      ? [`${namespace}.attributes.entries.field:${filterOptions.filter}*`]
      : []),
    ...(filterOptions.tags.length
      ? filterOptions.tags.map((t) => `${namespace}.attributes.tags:${t}`)
      : []),
  ];

  const query = {
    list_id: listId,
    namespace_type: namespaceType,
    page: pagination.page ? `${pagination.page}` : '1',
    per_page: pagination.perPage ? `${pagination.perPage}` : '20',
    ...(filters.length ? { filter: filters.join(' AND ') } : {}),
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
