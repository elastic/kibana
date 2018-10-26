/* tslint:disable */
/*
     * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
     * or more contributor license agreements. Licensed under the Elastic License;
     * you may not use this file except in compliance with the Elastic License.
     */
import { GraphQLResolveInfo } from 'graphql';

export type Resolver<Result, Parent = any, Context = any, Args = any> = (
  parent: Parent,
  args: Args,
  context: Context,
  info: GraphQLResolveInfo
) => Promise<Result> | Result;

export type SubscriptionResolver<Result, Parent = any, Context = any, Args = any> = {
  subscribe<R = Result, P = Parent>(
    parent: P,
    args: Args,
    context: Context,
    info: GraphQLResolveInfo
  ): AsyncIterator<R | Result>;
  resolve?<R = Result, P = Parent>(
    parent: P,
    args: Args,
    context: Context,
    info: GraphQLResolveInfo
  ): R | Result | Promise<R | Result>;
};

export interface Query {
  source: Source /** Get an infrastructure data source by id */;
  allSources: Source[] /** Get a list of all infrastructure data sources */;
}

export interface Source {
  id: string /** The id of the source */;
  configuration: SourceConfiguration /** The raw configuration of the source */;
}
/** A set of configuration options for an infrastructure data source */
export interface SourceConfiguration {
  fields: SourceFields /** The field mapping to use for this source */;
}
/** A mapping of semantic fields to their document counterparts */
export interface SourceFields {
  container: string /** The field to identify a container by */;
  host: string /** The fields to identify a host by */;
  message: string[] /** The fields that may contain the log event message. The first field found win. */;
  pod: string /** The field to identify a pod by */;
  tiebreaker: string /** The field to use as a tiebreaker for log events that have identical timestamps */;
  timestamp: string /** The field to use as a timestamp for metrics and logs */;
}
export interface SourceQueryArgs {
  id: string /** The id of the source */;
}

export namespace QueryResolvers {
  export interface Resolvers<Context = any> {
    source?: SourceResolver<Source, any, Context> /** Get an infrastructure data source by id */;
    allSources?: AllSourcesResolver<
      Source[],
      any,
      Context
    > /** Get a list of all infrastructure data sources */;
  }

  export type SourceResolver<R = Source, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context,
    SourceArgs
  >;
  export interface SourceArgs {
    id: string /** The id of the source */;
  }

  export type AllSourcesResolver<R = Source[], Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace SourceResolvers {
  export interface Resolvers<Context = any> {
    id?: IdResolver<string, any, Context> /** The id of the source */;
    configuration?: ConfigurationResolver<
      SourceConfiguration,
      any,
      Context
    > /** The raw configuration of the source */;
  }

  export type IdResolver<R = string, Parent = any, Context = any> = Resolver<R, Parent, Context>;
  export type ConfigurationResolver<
    R = SourceConfiguration,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
}
/** A set of configuration options for an infrastructure data source */
export namespace SourceConfigurationResolvers {
  export interface Resolvers<Context = any> {
    fields?: FieldsResolver<
      SourceFields,
      any,
      Context
    > /** The field mapping to use for this source */;
  }

  export type FieldsResolver<R = SourceFields, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}
/** A mapping of semantic fields to their document counterparts */
export namespace SourceFieldsResolvers {
  export interface Resolvers<Context = any> {
    container?: ContainerResolver<string, any, Context> /** The field to identify a container by */;
    host?: HostResolver<string, any, Context> /** The fields to identify a host by */;
    message?: MessageResolver<
      string[],
      any,
      Context
    > /** The fields that may contain the log event message. The first field found win. */;
    pod?: PodResolver<string, any, Context> /** The field to identify a pod by */;
    tiebreaker?: TiebreakerResolver<
      string,
      any,
      Context
    > /** The field to use as a tiebreaker for log events that have identical timestamps */;
    timestamp?: TimestampResolver<
      string,
      any,
      Context
    > /** The field to use as a timestamp for metrics and logs */;
  }

  export type ContainerResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type HostResolver<R = string, Parent = any, Context = any> = Resolver<R, Parent, Context>;
  export type MessageResolver<R = string[], Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type PodResolver<R = string, Parent = any, Context = any> = Resolver<R, Parent, Context>;
  export type TiebreakerResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TimestampResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}
