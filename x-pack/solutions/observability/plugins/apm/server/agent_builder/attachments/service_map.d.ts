import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { SERVICE_MAP_ATTACHMENT_TYPE} from '../../../common/agent_builder/attachments';
import { type ServiceMapAttachmentData } from '../../../common/agent_builder/attachments';
export declare const createServiceMapAttachmentType: () => AttachmentTypeDefinition<typeof SERVICE_MAP_ATTACHMENT_TYPE, ServiceMapAttachmentData>;
