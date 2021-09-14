import type {
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { AsyncResourceState } from '../../state/async_resource_state';

export interface HostIsolationExceptionsPageState {
  entries: ExceptionListItemSchema[];
  /** State for the Event Filters List page */
  listPage: {
    active: boolean;
    forceRefresh: boolean;
    data: AsyncResourceState<[]>;
    /** tracks if the overall list (not filtered or with invalid page numbers) contains data */
    dataExist: AsyncResourceState<boolean>;
    /** state for deletion of items from the list */
    deletion: {
      item: ExceptionListItemSchema | undefined;
      status: AsyncResourceState<ExceptionListItemSchema>;
    };
  };
}
