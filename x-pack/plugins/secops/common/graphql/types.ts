/* tslint:disable */
import { GraphQLResolveInfo } from 'graphql';

type Resolver<Result, Args = any> = (
  parent: any,
  args: Args,
  context: any,
  info: GraphQLResolveInfo
) => Promise<Result> | Result;

export interface Query {
  source: Source /** Get an infrastructure data source by id */;
  allSources: Source[] /** Get a list of all infrastructure data sources */;
}

export interface Source {
  id: string /** The id of the source */;
}

export namespace QueryResolvers {
  export interface Resolvers {
    source?: SourceResolver /** Get an infrastructure data source by id */;
    allSources?: AllSourcesResolver /** Get a list of all infrastructure data sources */;
  }

  export type SourceResolver = Resolver<Source, SourceArgs>;
  export interface SourceArgs {
    id: string /** The id of the source */;
  }

  export type AllSourcesResolver = Resolver<Source[]>;
}

export namespace SourceResolvers {
  export interface Resolvers {
    id?: IdResolver /** The id of the source */;
  }

  export type IdResolver = Resolver<string>;
}
export interface SourceQueryArgs {
  id: string /** The id of the source */;
}
