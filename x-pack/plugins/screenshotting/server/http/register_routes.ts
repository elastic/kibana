import { ScreenshottingCoreSetup } from "../plugin";
import {registerRenderExpressionRaw} from "./routes/render_expression_raw";
import {registerRenderExpression} from "./routes/render_expression";

export interface RegisterRoutesParams {
  core: ScreenshottingCoreSetup;
}

export const registerRoutes = ({core}: RegisterRoutesParams) => {
  const router = core.http.createRouter();

  registerRenderExpressionRaw({core, router});
  registerRenderExpression({core, router});
};
