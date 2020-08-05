/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { relationsSerializer, relationsDeserializer } from './relations_parameter';
import { dynamicSerializer, dynamicDeserializer } from './dynamic_parameter';

export * from './name_parameter';

export * from './index_parameter';

export * from './store_parameter';

export * from './doc_values_parameter';

export * from './boost_parameter';

export * from './analyzer_parameter';

export * from './analyzers_parameter';

export * from './null_value_parameter';

export * from './eager_global_ordinals_parameter';

export * from './norms_parameter';

export * from './similarity_parameter';

export * from './path_parameter';

export * from './coerce_number_parameter';

export * from './coerce_shape_parameter';

export * from './format_parameter';

export * from './ignore_malformed';

export * from './copy_to_parameter';

export * from './term_vector_parameter';

export * from './type_parameter';

export * from './subtype_parameter';

export * from './ignore_z_value_parameter';

export * from './orientation_parameter';

export * from './fielddata_parameter';

export * from './split_queries_on_whitespace_parameter';

export * from './locale_parameter';

export * from './dynamic_parameter';

export * from './enabled_parameter';

export * from './max_shingle_size_parameter';

export * from './relations_parameter';

export * from './other_type_name_parameter';

export * from './other_type_json_parameter';

export const PARAMETER_SERIALIZERS = [relationsSerializer, dynamicSerializer];

export const PARAMETER_DESERIALIZERS = [relationsDeserializer, dynamicDeserializer];
